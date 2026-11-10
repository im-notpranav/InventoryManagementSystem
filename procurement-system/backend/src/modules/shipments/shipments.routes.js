// Shipments (v3) — one delivery against a work order. Partial deliveries allowed.
//   vendor:  POST /            invoice first (number + PDF + qty per item)
//            PUT  /:id/dispatch vehicle, expected arrival, packages → gate code + QR pass
//            DELETE /:id        withdraw an invoice that has not been dispatched
//   HOD:     POST /:id/allow-retry   after a gate mismatch
//   faculty or HOD: POST /:id/review accepted qty per item → stock updated → billing
const express = require('express');
// qrcode is required on first gate-pass request, not at boot.
let QRCode = null;
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { ok, fail } = require('../../utils/response');
const { generateShipmentNumber } = require('../../utils/generateNumbers');
const { normalizeDepartment, DEFAULT_DEPARTMENT } = require('../../utils/departments');
const { addMonths } = require('../../utils/tracker');
const {
  FRONTEND_URL, WO_LEDGER_INCLUDE, quantityLedger, unitPriceMap, syncOrderStatus,
  generateGateCode, canManageRequest, hodsFor, usersWithRole, notify,
} = require('../../utils/orderCycle');

const router = express.Router();

const SHIP_INCLUDE = {
  wo: {
    select: {
      wo_id: true, wo_number: true, status: true, vendor_id: true, delivery_deadline: true,
      vendor: { select: { vendor_id: true, vendor_name: true, email: true, user_id: true } },
      request: {
        select: {
          request_id: true, pr_number: true, requested_by: true,
          user: { select: { user_id: true, name: true, email: true, department: true } },
        },
      },
    },
  },
  items: { include: { request_item: { include: { product: { select: { product_id: true, name: true, unit: true } } } } } },
  gate_checks: { include: { checker: { select: { name: true } } }, orderBy: { checked_at: 'desc' } },
  reviewer: { select: { name: true } },
};

const parseId = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const parseJson = (raw, fallback) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
};

const money = (n) => Math.round(Number(n) * 100) / 100;

function scope(user) {
  if (user.role === 'Vendor') return { wo: { vendor_id: user.vendor_id || -1 } };
  if (user.role === 'Department User') return { wo: { request: { requested_by: user.user_id } } };
  if (user.role === 'Admin' && user.department) {
    return { wo: { request: { user: { department: { equals: user.department, mode: 'insensitive' } } } } };
  }
  return {};
}

// Only the vendor (to show it) and the HOD may see a gate code.
const hideCode = (sh, user) => (['Vendor', 'Admin'].includes(user.role) ? sh : { ...sh, gate_code: undefined });

async function loadShipment(id) {
  return prisma.shipment.findUnique({ where: { shipment_id: id }, include: SHIP_INCLUDE });
}

function canReview(user, sh) {
  const pr = sh.wo.request;
  if (user.role === 'Department User') return pr.requested_by === user.user_id;
  return canManageRequest(user, pr);
}

// ── GET / ────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = scope(req.user);
    if (req.query.status) where.status = { in: String(req.query.status).split(',') };
    const data = await prisma.shipment.findMany({ where, include: SHIP_INCLUDE, orderBy: { created_at: 'desc' } });
    return ok(res, data.map((s) => hideCode(s, req.user)));
  } catch (err) { next(err); }
});

// ── GET /:id ─────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 'Invalid shipment ID', 400);
    const sh = await prisma.shipment.findFirst({ where: { shipment_id: id, ...scope(req.user) }, include: SHIP_INCLUDE });
    if (!sh) return fail(res, 'Shipment not found', 404);
    return ok(res, hideCode(sh, req.user));
  } catch (err) { next(err); }
});

// ── POST / — vendor submits invoice for a delivery ───────────
// multipart: invoice_file, wo_id, invoice_number, items JSON [{ request_item_id, qty }]
router.post('/', requireAuth, requireRole('Vendor'), upload.single('invoice_file'), async (req, res, next) => {
  try {
    const woId = parseId(req.body.wo_id);
    if (!woId) return fail(res, 'wo_id is required', 400);
    if (!req.file) return fail(res, 'Attach the invoice PDF', 400);
    const invoiceNumber = String(req.body.invoice_number || '').trim();
    if (!invoiceNumber) return fail(res, 'Invoice number is required', 400);

    const result = await prisma.$transaction(async (tx) => {
      const wo = await tx.workOrder.findUnique({ where: { wo_id: woId }, include: WO_LEDGER_INCLUDE });
      if (!wo || wo.vendor_id !== req.user.vendor_id) throw Object.assign(new Error('Work order not found'), { status: 404 });
      if (wo.status === 'completed') throw Object.assign(new Error('This work order is already fully delivered'), { status: 400 });

      const dup = await tx.shipment.findFirst({
        where: { invoice_number: { equals: invoiceNumber, mode: 'insensitive' }, wo: { vendor_id: wo.vendor_id } },
        select: { shipment_number: true },
      });
      if (dup) throw Object.assign(new Error(`Invoice ${invoiceNumber} was already used on ${dup.shipment_number}`), { status: 400 });

      const ledger = new Map(quantityLedger(wo).map((l) => [l.request_item_id, l]));
      const prices = unitPriceMap(wo);
      const lines = [];
      for (const row of parseJson(req.body.items, [])) {
        const itemId = parseId(row.request_item_id);
        const qty = parseInt(row.qty, 10);
        if (!itemId || !qty) continue;
        const l = ledger.get(itemId);
        if (!l) throw Object.assign(new Error('Item does not belong to this work order'), { status: 400 });
        if (qty < 0 || qty > l.remaining) {
          throw Object.assign(new Error(`${l.product?.name || 'Item'}: you can ship at most ${l.remaining}`), { status: 400 });
        }
        lines.push({ request_item_id: itemId, qty_shipped: qty, unit_price: prices.get(itemId) || 0 });
      }
      if (!lines.length) throw Object.assign(new Error('Enter the quantity you are shipping for at least one item'), { status: 400 });

      const shipment = await tx.shipment.create({
        data: {
          shipment_number: await generateShipmentNumber(tx, wo),
          wo_id: wo.wo_id,
          status: 'invoiced',
          invoice_number: invoiceNumber,
          invoice_url: `/uploads/${req.file.filename}`,
          invoice_amount: money(lines.reduce((s, l) => s + l.qty_shipped * Number(l.unit_price), 0)),
          items: { create: lines },
        },
      });
      await syncOrderStatus(tx, wo.wo_id);
      return shipment;
    });

    return ok(res, await loadShipment(result.shipment_id), `Invoice ${invoiceNumber} submitted. Add dispatch details when the goods leave.`, 201);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    next(err);
  }
});

// ── DELETE /:id — vendor withdraws an undispatched invoice ───
router.delete('/:id', requireAuth, requireRole('Vendor'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const sh = id && await loadShipment(id);
    if (!sh || sh.wo.vendor_id !== req.user.vendor_id) return fail(res, 'Shipment not found', 404);
    if (sh.status !== 'invoiced') return fail(res, 'Only invoices that are not dispatched yet can be withdrawn', 400);
    await prisma.$transaction(async (tx) => {
      await tx.shipment.delete({ where: { shipment_id: id } });
      await syncOrderStatus(tx, sh.wo.wo_id);
    });
    return ok(res, null, 'Invoice withdrawn');
  } catch (err) { next(err); }
});

// ── PUT /:id/dispatch — vendor adds dispatch details ─────────
// body: { vehicle_number, expected_arrival, num_packages }  (editable until the gate check)
router.put('/:id/dispatch', requireAuth, requireRole('Vendor'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const sh = id && await loadShipment(id);
    if (!sh || sh.wo.vendor_id !== req.user.vendor_id) return fail(res, 'Shipment not found', 404);
    if (!['invoiced', 'dispatched'].includes(sh.status)) return fail(res, `Dispatch details are locked (status: ${sh.status})`, 400);

    const vehicle = String(req.body.vehicle_number || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (vehicle.length < 4) return fail(res, 'Enter the vehicle number', 400);
    const arrival = new Date(req.body.expected_arrival);
    if (Number.isNaN(arrival.getTime())) return fail(res, 'Expected arrival date is required', 400);
    const packages = parseInt(req.body.num_packages, 10);
    if (!Number.isInteger(packages) || packages < 1) return fail(res, 'Number of packages must be at least 1', 400);

    const first = sh.status === 'invoiced';
    await prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { shipment_id: id },
        data: {
          vehicle_number: vehicle,
          expected_arrival: arrival,
          num_packages: packages,
          status: 'dispatched',
          dispatched_at: sh.dispatched_at || new Date(),
          gate_code: sh.gate_code || await generateGateCode(tx),
        },
      });
    });

    if (first) {
      const pr = sh.wo.request;
      notify([...(await hodsFor(pr.user?.department)), pr.user], {
        type: 'shipment_dispatched',
        message: `${sh.shipment_number} dispatched by ${sh.wo.vendor.vendor_name}, arriving ${arrival.toDateString()}`,
      });
    }

    return ok(res, await loadShipment(id), first ? 'Dispatched. Share the gate pass with the driver.' : 'Dispatch details updated');
  } catch (err) { next(err); }
});

// ── GET /:id/gate-pass — code + QR for the driver ────────────
router.get('/:id/gate-pass', requireAuth, requireRole('Vendor', 'Admin'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const sh = id && await prisma.shipment.findFirst({ where: { shipment_id: id, ...scope(req.user) }, include: SHIP_INCLUDE });
    if (!sh) return fail(res, 'Shipment not found', 404);
    if (!sh.gate_code || !['dispatched', 'gate_blocked'].includes(sh.status)) return fail(res, 'Gate pass is available after dispatch', 400);

    const url = `${FRONTEND_URL()}/gate-entry?code=${sh.gate_code}`;
    QRCode = QRCode || require('qrcode');
    const qr = await QRCode.toDataURL(url, { margin: 1, width: 320 });
    return ok(res, {
      shipment_number: sh.shipment_number,
      wo_number: sh.wo.wo_number,
      vendor_name: sh.wo.vendor.vendor_name,
      gate_code: sh.gate_code,
      vehicle_number: sh.vehicle_number,
      num_packages: sh.num_packages,
      expected_arrival: sh.expected_arrival,
      invoice_number: sh.invoice_number,
      items: sh.items.map((i) => ({ name: i.request_item.product.name, unit: i.request_item.product.unit, qty: i.qty_shipped })),
      qr,
    });
  } catch (err) { next(err); }
});

// ── POST /:id/allow-retry — HOD lets a blocked delivery try the gate again ──
router.post('/:id/allow-retry', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const sh = id && await loadShipment(id);
    if (!sh) return fail(res, 'Shipment not found', 404);
    if (!canManageRequest(req.user, sh.wo.request)) return fail(res, 'This delivery belongs to another department', 403);
    if (sh.status !== 'gate_blocked') return fail(res, 'Only blocked deliveries can be retried', 400);

    await prisma.shipment.update({ where: { shipment_id: id }, data: { status: 'dispatched' } });
    const v = sh.wo.vendor;
    notify([{ user_id: v.user_id || undefined, email: v.email }], {
      type: 'gate_retry',
      message: `${sh.shipment_number}: gate retry allowed. Update dispatch details if they were wrong.`,
      email: {
        subject: `Gate retry allowed: ${sh.shipment_number}`,
        heading: 'Your delivery can try the gate again',
        rows: [['Delivery', sh.shipment_number], ['Last gate remark', sh.gate_checks[0]?.reason]],
        cta: { label: 'Open vendor portal', url: `${FRONTEND_URL()}/vendor-portal` },
      },
    });
    return ok(res, await loadShipment(id), 'Retry allowed');
  } catch (err) { next(err); }
});

// Optional warranty per accepted line, entered at review:
//   [{ shipment_item_id, months, serials: ['SN1', ...] }]
// One record per serial number; accepted units without a serial share one record.
function readWarranties(raw, lines) {
  const byItem = new Map(lines.map((l) => [l.si.shipment_item_id, l]));
  const out = [];
  for (const w of parseJson(raw, [])) {
    const line = byItem.get(parseId(w?.shipment_item_id));
    const months = parseInt(w?.months, 10);
    if (!line || !months) continue;
    const name = line.si.request_item.product.name;
    if (!Number.isInteger(months) || months < 1 || months > 240) return { error: `${name}: warranty must be 1 to 240 months` };
    if (line.accepted < 1) continue;
    const serials = [...new Set((Array.isArray(w.serials) ? w.serials : String(w.serials || '').split(/[\n,;]+/))
      .map((x) => String(x).trim()).filter(Boolean))];
    if (serials.length > line.accepted) return { error: `${name}: ${serials.length} serial numbers for ${line.accepted} accepted unit(s)` };
    out.push({ line, months, serials });
  }
  return { list: out };
}

// ── POST /:id/review — faculty or HOD checks the goods ───────
// body: { items: [{ shipment_item_id, qty_accepted }], remarks, warranties? }
router.post('/:id/review', requireAuth, requireRole('Admin', 'Department User'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const sh = id && await loadShipment(id);
    if (!sh) return fail(res, 'Shipment not found', 404);
    if (!canReview(req.user, sh)) return fail(res, 'You cannot review this delivery', 403);
    if (sh.status !== 'received') return fail(res, `Delivery is ${sh.status}; it must pass the gate first`, 400);

    const input = new Map(parseJson(req.body.items, []).map((r) => [parseId(r.shipment_item_id), parseInt(r.qty_accepted, 10)]));
    const lines = [];
    for (const si of sh.items) {
      const accepted = input.get(si.shipment_item_id);
      if (!Number.isInteger(accepted) || accepted < 0 || accepted > si.qty_shipped) {
        return fail(res, `${si.request_item.product.name}: accepted qty must be between 0 and ${si.qty_shipped}`, 400);
      }
      lines.push({ si, accepted, rejected: si.qty_shipped - accepted });
    }
    const remarks = String(req.body.remarks || '').trim() || null;
    const anyRejected = lines.some((l) => l.rejected > 0);
    if (anyRejected && !remarks) return fail(res, 'Explain what was wrong with the rejected items', 400);
    const warranty = readWarranties(req.body.warranties, lines);
    if (warranty.error) return fail(res, warranty.error, 400);

    const totalAccepted = lines.reduce((s, l) => s + l.accepted, 0);
    const billable = money(lines.reduce((s, l) => s + l.accepted * Number(l.si.unit_price), 0));
    const status = totalAccepted > 0 ? 'reviewed' : 'rejected';

    // Accepted goods become stock of the requesting department.
    const stockDept = normalizeDepartment(sh.wo.request.user?.department) || DEFAULT_DEPARTMENT;
    await prisma.$transaction(async (tx) => {
      for (const { si, accepted } of lines) {
        await tx.shipmentItem.update({ where: { shipment_item_id: si.shipment_item_id }, data: { qty_accepted: accepted } });
        if (accepted > 0) {
          const productId = si.request_item.product_id;
          await tx.inventory.upsert({
            where: { product_id_department: { product_id: productId, department: stockDept } },
            update: { quantity_available: { increment: accepted } },
            create: { product_id: productId, department: stockDept, quantity_available: accepted, reorder_point: 0, min_stock: 0, max_stock: 0 },
          });
        }
      }
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      for (const { line, months, serials } of warranty.list) {
        const base = {
          product_id: line.si.request_item.product_id,
          vendor_id: sh.wo.vendor_id,
          wo_id: sh.wo.wo_id,
          shipment_id: id,
          department: stockDept,
          start_date: start,
          end_date: addMonths(start, months),
          created_by: req.user.user_id,
          notes: `Recorded at goods review of ${sh.shipment_number}`,
        };
        const rows = serials.map((sn) => ({ ...base, serial_number: sn, quantity: 1 }));
        const rest = line.accepted - serials.length;
        if (rest > 0) rows.push({ ...base, quantity: rest });
        await tx.warranty.createMany({ data: rows });
      }
      await tx.shipment.update({
        where: { shipment_id: id },
        data: {
          status, reviewed_by: req.user.user_id, reviewed_at: new Date(),
          review_remarks: remarks, billable_amount: billable,
        },
      });
      await syncOrderStatus(tx, sh.wo.wo_id);
    });

    if (status === 'reviewed') {
      notify(await usersWithRole('Accountant'), {
        type: 'bill_ready',
        message: `${sh.shipment_number} (${sh.wo.vendor.vendor_name}) ready for billing: ₹${billable.toLocaleString('en-IN')}`,
        email: {
          subject: `Bill ready for approval: ${sh.shipment_number}`,
          heading: 'Delivery accepted — bill ready for approval',
          rows: [['Delivery', sh.shipment_number], ['Vendor', sh.wo.vendor.vendor_name], ['Invoice', sh.invoice_number], ['Amount to pay', `₹${billable.toLocaleString('en-IN')}`]],
          cta: { label: 'Open billing', url: `${FRONTEND_URL()}/billing` },
        },
      });
    }
    if (anyRejected) {
      const v = sh.wo.vendor;
      notify([{ user_id: v.user_id || undefined, email: v.email }], {
        type: 'items_rejected',
        message: `${sh.shipment_number}: some items were rejected. Please send replacements.`,
        email: {
          subject: `Items rejected: ${sh.shipment_number}`,
          heading: 'Some items were rejected — please send replacements',
          rows: [
            ...lines.filter((l) => l.rejected > 0).map((l) => [l.si.request_item.product.name, `${l.rejected} rejected`]),
            ['Reason', remarks],
          ],
          cta: { label: 'Open work order', url: `${FRONTEND_URL()}/vendor-portal` },
        },
      });
    }

    return ok(res, await loadShipment(id), status === 'reviewed' ? 'Review saved and sent to billing' : 'All items rejected; vendor notified');
  } catch (err) { next(err); }
});

module.exports = router;

// Gate verification (v3)
//   Driver shows the gate pass (QR or 6-digit code).
//   Watchman: GET /lookup/:code → sees expected vehicle, packages, items
//             POST /:id/check   → match (goods go to review) | mismatch (HOD decides retry)
const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { ok, fail } = require('../../utils/response');
const { FRONTEND_URL, hodsFor, notify } = require('../../utils/orderCycle');

const router = express.Router();
const GATE_ROLES = ['Watchman', 'Admin'];

const INCLUDE = {
  wo: {
    select: {
      wo_number: true,
      vendor: { select: { vendor_name: true } },
      request: { select: { pr_number: true, requested_by: true, user: { select: { user_id: true, name: true, email: true, department: true } } } },
    },
  },
  items: { include: { request_item: { include: { product: { select: { name: true, unit: true } } } } } },
  gate_checks: { include: { checker: { select: { name: true } } }, orderBy: { checked_at: 'desc' } },
};

// What the watchman needs — nothing more.
const gateView = (sh) => ({
  shipment_id: sh.shipment_id,
  shipment_number: sh.shipment_number,
  status: sh.status,
  wo_number: sh.wo.wo_number,
  vendor_name: sh.wo.vendor.vendor_name,
  department: sh.wo.request.user?.department || null,
  vehicle_number: sh.vehicle_number,
  num_packages: sh.num_packages,
  expected_arrival: sh.expected_arrival,
  invoice_number: sh.invoice_number,
  items: sh.items.map((i) => ({ name: i.request_item.product.name, unit: i.request_item.product.unit, qty: i.qty_shipped })),
  last_check: sh.gate_checks[0]
    ? { result: sh.gate_checks[0].result, reason: sh.gate_checks[0].reason, at: sh.gate_checks[0].checked_at, by: sh.gate_checks[0].checker?.name }
    : null,
});

// ── GET /lookup/:code ────────────────────────────────────────
router.get('/lookup/:code', requireAuth, requireRole(...GATE_ROLES), async (req, res, next) => {
  try {
    const code = String(req.params.code || '').replace(/\D/g, '');
    if (code.length !== 6) return fail(res, 'Enter the 6-digit gate code', 400);
    const matches = await prisma.shipment.findMany({
      where: { gate_code: code, status: { in: ['dispatched', 'gate_blocked'] } },
      include: INCLUDE,
    });
    if (!matches.length) return fail(res, 'No delivery is expected with this code', 404);
    if (matches.length > 1) return fail(res, 'Code is ambiguous — ask the HOD to check', 409);
    return ok(res, gateView(matches[0]));
  } catch (err) { next(err); }
});

// ── POST /:id/check — match | mismatch ──────────────────────
// multipart: result, reason (required on mismatch), photo (optional)
router.post('/:id/check', requireAuth, requireRole(...GATE_ROLES), upload.single('photo'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const sh = Number.isInteger(id) && await prisma.shipment.findUnique({ where: { shipment_id: id }, include: INCLUDE });
    if (!sh) return fail(res, 'Delivery not found', 404);
    if (sh.status === 'gate_blocked') return fail(res, 'This delivery is blocked. The HOD must allow a retry first.', 400);
    if (sh.status !== 'dispatched') return fail(res, `This delivery is ${sh.status}; it is not waiting at the gate`, 400);

    const result = req.body.result;
    if (!['match', 'mismatch'].includes(result)) return fail(res, 'Result must be match or mismatch', 400);
    const reason = String(req.body.reason || '').trim() || null;
    if (result === 'mismatch' && !reason) return fail(res, 'Say what did not match', 400);

    const now = new Date();
    await prisma.$transaction([
      prisma.gateCheck.create({
        data: {
          shipment_id: id, checked_by: req.user.user_id, result, reason,
          photo_url: req.file ? `/uploads/${req.file.filename}` : null,
        },
      }),
      prisma.shipment.update({
        where: { shipment_id: id },
        data: result === 'match' ? { status: 'received', received_at: now } : { status: 'gate_blocked' },
      }),
    ]);

    const pr = sh.wo.request;
    const hods = await hodsFor(pr.user?.department);
    if (result === 'match') {
      notify([pr.user, ...hods], {
        type: 'goods_arrived',
        message: `${sh.shipment_number} arrived at the gate — please review the goods`,
        email: {
          subject: `Goods arrived: ${sh.shipment_number}`,
          heading: 'Goods passed the gate — review needed',
          intro: 'Check the items and record the accepted quantity.',
          rows: [['Delivery', sh.shipment_number], ['Request', pr.pr_number], ['Vendor', sh.wo.vendor.vendor_name]],
          cta: { label: 'Review goods', url: `${FRONTEND_URL()}/goods-review` },
        },
      });
    } else {
      notify(hods, {
        type: 'gate_blocked',
        message: `${sh.shipment_number} blocked at gate: ${reason}`,
        email: {
          subject: `Gate blocked: ${sh.shipment_number}`,
          heading: 'Delivery blocked at the gate',
          rows: [['Delivery', sh.shipment_number], ['Vendor', sh.wo.vendor.vendor_name], ['Vehicle', sh.vehicle_number], ['Reason', reason], ['Checked by', req.user.name]],
          cta: { label: 'Decide', url: `${FRONTEND_URL()}/work-orders` },
        },
      });
    }

    return ok(res, { ...gateView(sh), status: result === 'match' ? 'received' : 'gate_blocked' },
      result === 'match' ? 'Entry allowed — goods sent for review' : 'Entry blocked — HOD notified');
  } catch (err) { next(err); }
});

// ── GET /expected — deliveries on the way (no codes) ────────
router.get('/expected', requireAuth, requireRole(...GATE_ROLES), async (req, res, next) => {
  try {
    const rows = await prisma.shipment.findMany({
      where: { status: { in: ['dispatched', 'gate_blocked'] } },
      include: INCLUDE,
      orderBy: { expected_arrival: 'asc' },
    });
    return ok(res, rows.map(gateView));
  } catch (err) { next(err); }
});

// ── GET /history — recent gate checks ────────────────────────
router.get('/history', requireAuth, requireRole(...GATE_ROLES), async (req, res, next) => {
  try {
    const rows = await prisma.gateCheck.findMany({
      take: 100,
      orderBy: { checked_at: 'desc' },
      include: {
        checker: { select: { name: true } },
        shipment: { select: { shipment_number: true, vehicle_number: true, wo: { select: { vendor: { select: { vendor_name: true } } } } } },
      },
    });
    return ok(res, rows);
  } catch (err) { next(err); }
});

module.exports = router;

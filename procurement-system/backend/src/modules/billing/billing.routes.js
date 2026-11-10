// Billing (v3) — per delivery, after goods review.
//   Accountant: reviewed → approve → record payment (date, mode, reference) → paid
//   One screen shows quote, work order, invoice, gate check and accepted qty.
const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { FRONTEND_URL, hodsFor, notify } = require('../../utils/orderCycle');

const router = express.Router();

const BILLING_STATES = ['reviewed', 'bill_approved', 'paid'];
const PAYMENT_MODES = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Cash', 'Other'];

const INCLUDE = {
  wo: {
    select: {
      wo_id: true, wo_number: true, agreed_price: true, terms: true,
      vendor: { select: { vendor_id: true, vendor_name: true, email: true, user_id: true } },
      submission: { select: { quotation_file_url: true, total_price: true } },
      request: { select: { pr_number: true, letter_url: true, user: { select: { name: true, department: true } } } },
    },
  },
  items: { include: { request_item: { include: { product: { select: { name: true, unit: true } } } } } },
  gate_checks: { include: { checker: { select: { name: true } } }, orderBy: { checked_at: 'desc' } },
  reviewer: { select: { name: true } },
  approver: { select: { name: true } },
  payer: { select: { name: true } },
};

const parseId = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ── GET / — bills (Accountant: all, HOD: own department, read only) ──
router.get('/', requireAuth, requireRole('Accountant', 'Admin'), async (req, res, next) => {
  try {
    const wanted = req.query.status ? String(req.query.status).split(',').filter((s) => BILLING_STATES.includes(s)) : BILLING_STATES;
    const where = { status: { in: wanted } };
    if (req.user.role === 'Admin' && req.user.department) {
      where.wo = { request: { user: { department: { equals: req.user.department, mode: 'insensitive' } } } };
    }
    const data = await prisma.shipment.findMany({ where, include: INCLUDE, orderBy: { reviewed_at: 'asc' } });
    return ok(res, data.map((s) => ({ ...s, gate_code: undefined })));
  } catch (err) { next(err); }
});

// ── POST /:id/approve ────────────────────────────────────────
router.post('/:id/approve', requireAuth, requireRole('Accountant'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const sh = id && await prisma.shipment.findUnique({ where: { shipment_id: id } });
    if (!sh) return fail(res, 'Bill not found', 404);
    if (sh.status !== 'reviewed') return fail(res, `Bill is ${sh.status}; only reviewed deliveries can be approved`, 400);
    if (!sh.invoice_url) return fail(res, 'Vendor invoice is missing', 400);

    const updated = await prisma.shipment.update({
      where: { shipment_id: id },
      data: {
        status: 'bill_approved',
        bill_approved_by: req.user.user_id,
        bill_approved_at: new Date(),
        accountant_remarks: String(req.body.remarks || '').trim() || null,
      },
      include: INCLUDE,
    });
    return ok(res, updated, 'Bill approved');
  } catch (err) { next(err); }
});

// ── POST /:id/pay — record payment ──────────────────────────
// body: { payment_date, payment_mode, payment_ref }
router.post('/:id/pay', requireAuth, requireRole('Accountant'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const sh = id && await prisma.shipment.findUnique({ where: { shipment_id: id }, include: INCLUDE });
    if (!sh) return fail(res, 'Bill not found', 404);
    if (sh.status !== 'bill_approved') return fail(res, 'Approve the bill before recording payment', 400);

    const date = new Date(req.body.payment_date);
    if (Number.isNaN(date.getTime())) return fail(res, 'Payment date is required', 400);
    if (date > new Date()) return fail(res, 'Payment date cannot be in the future', 400);
    const mode = String(req.body.payment_mode || '');
    if (!PAYMENT_MODES.includes(mode)) return fail(res, `Payment mode must be one of: ${PAYMENT_MODES.join(', ')}`, 400);
    const ref = String(req.body.payment_ref || '').trim();
    if (mode !== 'Cash' && !ref) return fail(res, 'Transaction / cheque reference is required', 400);

    const updated = await prisma.shipment.update({
      where: { shipment_id: id },
      data: { status: 'paid', paid_by: req.user.user_id, payment_date: date, payment_mode: mode, payment_ref: ref || null },
      include: INCLUDE,
    });

    const amount = `₹${Number(sh.billable_amount || 0).toLocaleString('en-IN')}`;
    const v = sh.wo.vendor;
    notify([{ user_id: v.user_id || undefined, email: v.email }], {
      type: 'bill_paid',
      message: `Payment ${amount} released for ${sh.shipment_number}`,
      email: {
        subject: `Payment released: ${sh.invoice_number}`,
        heading: 'Payment released',
        rows: [['Invoice', sh.invoice_number], ['Delivery', sh.shipment_number], ['Amount', amount], ['Mode', mode], ['Reference', ref], ['Date', date.toDateString()]],
        cta: { label: 'Open vendor portal', url: `${FRONTEND_URL()}/vendor-portal` },
      },
    });
    notify(await hodsFor(sh.wo.request.user?.department), {
      type: 'bill_paid',
      message: `${sh.shipment_number} paid (${amount})`,
    });

    return ok(res, updated, 'Payment recorded');
  } catch (err) { next(err); }
});

module.exports = router;

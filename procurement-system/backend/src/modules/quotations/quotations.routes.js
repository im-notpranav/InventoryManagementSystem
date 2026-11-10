// Quotations (v3)
//   vendor: see RFQs, quote price per item + expected delivery + one PDF (revisable until close)
//   HOD:    select ONE winner → work order created & issued, other quotes auto-rejected
const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { ok, fail } = require('../../utils/response');
const { generateWONumber } = require('../../utils/generateNumbers');
const { FRONTEND_URL, canManageRequest, notify } = require('../../utils/orderCycle');

const router = express.Router();

const parseId = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const parseJson = (raw, fallback) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
};

const isClosed = (pr) => Boolean(pr.rfq_closes_at && new Date(pr.rfq_closes_at) <= new Date());

// ── GET /my-rfqs — vendor's open and past RFQs ───────────────
router.get('/my-rfqs', requireAuth, requireRole('Vendor'), async (req, res, next) => {
  try {
    if (!req.user.vendor_id) return fail(res, 'No vendor profile linked to this account', 403);
    const rfqs = await prisma.vendorRFQ.findMany({
      where: { vendor_id: req.user.vendor_id },
      include: {
        request: {
          select: {
            request_id: true, pr_number: true, required_date: true, rfq_closes_at: true, status: true,
            items: { select: { item_id: true, quantity: true, notes: true, product: { select: { name: true, unit: true } } } },
            quote_submissions: {
              where: { vendor_id: req.user.vendor_id },
              include: { items: true },
            },
          },
        },
      },
      orderBy: { sent_at: 'desc' },
    });
    const data = rfqs.map((r) => {
      const { quote_submissions: subs, ...request } = r.request;
      return { ...r, request, submission: subs[0] || null, closed: isClosed(r.request) };
    });
    return ok(res, data);
  } catch (err) { next(err); }
});

// ── POST /submit — vendor quotes (or revises before closing) ─
// multipart: quotation_file, request_id, expected_delivery, notes, items JSON [{ request_item_id, unit_price }]
router.post('/submit', requireAuth, requireRole('Vendor'), upload.single('quotation_file'), async (req, res, next) => {
  try {
    const vendorId = req.user.vendor_id;
    if (!vendorId) return fail(res, 'No vendor profile linked to this account', 403);

    const requestId = parseId(req.body.request_id);
    if (!requestId) return fail(res, 'request_id is required', 400);

    const rfq = await prisma.vendorRFQ.findFirst({ where: { request_id: requestId, vendor_id: vendorId } });
    if (!rfq) return fail(res, 'You were not invited to quote on this request', 403);

    const pr = await prisma.purchaseRequest.findUnique({ where: { request_id: requestId }, include: { items: true } });
    if (!pr) return fail(res, 'Request not found', 404);
    if (pr.status !== 'rfq_sent') return fail(res, 'This RFQ is no longer accepting quotations', 400);
    if (isClosed(pr)) return fail(res, 'Quotations closed for this request', 400);

    const delivery = new Date(req.body.expected_delivery);
    if (Number.isNaN(delivery.getTime())) return fail(res, 'Expected delivery date is required', 400);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (delivery < today) return fail(res, 'Expected delivery date cannot be in the past', 400);

    const priced = parseJson(req.body.items, []);
    const priceById = new Map(priced.map((p) => [parseId(p.request_item_id), parseFloat(p.unit_price)]));
    const lines = [];
    for (const item of pr.items) {
      const price = priceById.get(item.item_id);
      if (!Number.isFinite(price) || price <= 0) return fail(res, 'Enter a price greater than 0 for every item', 400);
      lines.push({ request_item_id: item.item_id, unit_price: price, qty: item.quantity });
    }
    const total = Math.round(lines.reduce((s, l) => s + l.unit_price * l.qty, 0) * 100) / 100;

    const existing = await prisma.vendorQuoteSubmission.findFirst({ where: { request_id: requestId, vendor_id: vendorId } });
    if (existing && existing.status !== 'pending') return fail(res, 'This quotation has already been decided', 400);
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : existing?.quotation_file_url;
    if (!fileUrl) return fail(res, 'Attach your quotation PDF', 400);

    const data = {
      quotation_file_url: fileUrl,
      total_price: total,
      expected_delivery: delivery,
      notes: req.body.notes?.trim() || null,
    };
    const itemRows = lines.map(({ request_item_id, unit_price }) => ({ request_item_id, unit_price }));

    const submission = await prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.quotationItem.deleteMany({ where: { submission_id: existing.submission_id } });
        return tx.vendorQuoteSubmission.update({
          where: { submission_id: existing.submission_id },
          data: { ...data, submitted_at: new Date(), items: { create: itemRows } },
          include: { items: true },
        });
      }
      const created = await tx.vendorQuoteSubmission.create({
        data: { ...data, request_id: requestId, vendor_id: vendorId, items: { create: itemRows } },
        include: { items: true },
      });
      await tx.vendorRFQ.updateMany({ where: { request_id: requestId, vendor_id: vendorId }, data: { status: 'submitted' } });
      return created;
    });

    return ok(res, submission, existing ? 'Quotation updated' : 'Quotation submitted');
  } catch (err) { next(err); }
});

// ── POST /:id/select — HOD picks the winning quotation ──────
// body: { terms }  → creates + issues the work order from the quote (no re-typing)
router.post('/:id/select', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const submissionId = parseId(req.params.id);
    if (!submissionId) return fail(res, 'Invalid quotation ID', 400);

    const sub = await prisma.vendorQuoteSubmission.findUnique({
      where: { submission_id: submissionId },
      include: {
        vendor: true,
        request: {
          include: {
            user: true,
            items: { include: { product: true } },
            vendor_rfqs: true,
            quote_submissions: { include: { vendor: true } },
          },
        },
      },
    });
    if (!sub) return fail(res, 'Quotation not found', 404);
    const pr = sub.request;
    if (!canManageRequest(req.user, pr)) return fail(res, 'This request belongs to another department', 403);
    if (pr.status !== 'rfq_sent') return fail(res, `A vendor was already chosen (request is ${pr.status})`, 400);
    if (sub.status !== 'pending') return fail(res, 'This quotation is no longer open', 400);

    const allIn = pr.vendor_rfqs.length > 0 && pr.vendor_rfqs.every((r) => pr.quote_submissions.some((s) => s.vendor_id === r.vendor_id));
    if (!isClosed(pr) && !allIn && pr.rfq_closes_at) {
      return fail(res, `Quotes are still open until ${new Date(pr.rfq_closes_at).toLocaleString()}. Wait for the closing date or for all vendors to reply.`, 400);
    }

    const terms = String(req.body.terms || '').trim() || null;
    const now = new Date();
    const deadline = sub.expected_delivery || pr.required_date || new Date(Date.now() + 14 * 864e5);
    const woNumber = await generateWONumber(pr.user?.department);

    const wo = await prisma.$transaction(async (tx) => {
      await tx.vendorQuoteSubmission.update({
        where: { submission_id: sub.submission_id },
        data: { status: 'selected', reviewed_at: now, reviewed_by: req.user.user_id },
      });
      await tx.vendorQuoteSubmission.updateMany({
        where: { request_id: pr.request_id, submission_id: { not: sub.submission_id }, status: 'pending' },
        data: { status: 'rejected', admin_remarks: 'Another quotation was selected', reviewed_at: now, reviewed_by: req.user.user_id },
      });
      const created = await tx.workOrder.create({
        data: {
          wo_number: woNumber,
          submission_id: sub.submission_id,
          request_id: pr.request_id,
          vendor_id: sub.vendor_id,
          created_by: req.user.user_id,
          agreed_price: sub.total_price,
          delivery_deadline: deadline,
          terms,
          status: 'issued',
        },
      });
      await tx.purchaseRequest.update({ where: { request_id: pr.request_id }, data: { status: 'wo_issued' } });
      return created;
    });

    const portal = `${FRONTEND_URL()}/vendor-portal`;
    const vendorUser = sub.vendor.user_id ? { user_id: sub.vendor.user_id, email: sub.vendor.email } : { email: sub.vendor.email };
    notify([vendorUser], {
      type: 'wo_issued',
      message: `Work order ${wo.wo_number} issued for ${pr.pr_number}`,
      email: {
        subject: `Work order ${wo.wo_number}`,
        heading: 'You have been awarded a work order',
        intro: 'Upload your invoice in the vendor portal, then add the dispatch details to get your gate pass.',
        rows: [
          ['Work order', wo.wo_number],
          ['Items', pr.items.map((i) => `${i.product.name} × ${i.quantity}`).join(', ')],
          ['Amount', `₹${Number(wo.agreed_price).toLocaleString('en-IN')}`],
          ['Deliver by', deadline.toDateString()],
          ['Terms', terms],
        ],
        cta: { label: 'Open work order', url: portal },
      },
    });
    for (const lost of pr.quote_submissions.filter((s) => s.submission_id !== sub.submission_id && s.status === 'pending')) {
      notify([{ user_id: lost.vendor.user_id || undefined, email: lost.vendor.email }], {
        type: 'quote_rejected',
        message: `Your quotation for ${pr.pr_number} was not selected`,
        email: {
          subject: `Quotation not selected: ${pr.pr_number}`,
          heading: 'Thank you for your quotation',
          intro: 'Another quotation was selected for this request.',
          rows: [['Reference', pr.pr_number]],
        },
      });
    }
    notify([pr.user], {
      type: 'wo_issued',
      message: `${pr.pr_number}: vendor ${sub.vendor.vendor_name} selected (${wo.wo_number})`,
    });

    return ok(res, wo, `Work order ${wo.wo_number} issued to ${sub.vendor.vendor_name}`);
  } catch (err) { next(err); }
});

module.exports = router;

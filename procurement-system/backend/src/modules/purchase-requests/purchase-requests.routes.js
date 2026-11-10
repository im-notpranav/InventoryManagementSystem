// Purchase requests (v3)
//   faculty: create with principal letter → HOD (same department): approve / reject
//   HOD: send RFQ to registered vendors and/or any email (invite) with a closing date
const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { ok, fail } = require('../../utils/response');
const { generatePRNumber } = require('../../utils/generateNumbers');
const {
  FRONTEND_URL, requestScope, canManageRequest, canViewRequest,
  hodsFor, notify, newInviteToken,
} = require('../../utils/orderCycle');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_DAYS = 30;

const LIST_INCLUDE = {
  user: { select: { user_id: true, name: true, email: true, department: true } },
  items: { include: { product: { select: { product_id: true, name: true, sku: true, unit: true } } } },
  approval_logs: { include: { approver: { select: { name: true } } }, orderBy: { acted_at: 'asc' } },
  _count: { select: { vendor_rfqs: true, quote_submissions: true } },
};

const DETAIL_INCLUDE = {
  ...LIST_INCLUDE,
  vendor_rfqs: {
    include: { vendor: { select: { vendor_id: true, vendor_name: true, email: true, status: true } } },
    orderBy: { sent_at: 'asc' },
  },
  quote_submissions: {
    include: {
      vendor: { select: { vendor_id: true, vendor_name: true, email: true } },
      items: true,
    },
    orderBy: { total_price: 'asc' },
  },
  work_orders: {
    include: {
      vendor: { select: { vendor_id: true, vendor_name: true, email: true } },
      shipments: { include: { items: true, gate_checks: { orderBy: { checked_at: 'desc' } } }, orderBy: { created_at: 'asc' } },
    },
  },
};

const parseId = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const parseJson = (raw, fallback) => {
  if (Array.isArray(raw)) return raw;
  try { return JSON.parse(raw); } catch { return fallback; }
};

async function loadForManage(req, res) {
  const id = parseId(req.params.id);
  if (!id) { fail(res, 'Invalid request ID', 400); return null; }
  const pr = await prisma.purchaseRequest.findUnique({
    where: { request_id: id },
    include: { user: true, items: { include: { product: true } } },
  });
  if (!pr) { fail(res, 'Purchase request not found', 404); return null; }
  if (!canManageRequest(req.user, pr)) { fail(res, 'This request belongs to another department', 403); return null; }
  return pr;
}

// ── GET / — list (faculty: own, HOD: own department) ─────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = { ...requestScope(req.user) };
    if (req.query.status) where.status = { in: String(req.query.status).split(',') };
    const data = await prisma.purchaseRequest.findMany({
      where, include: LIST_INCLUDE, orderBy: { requested_at: 'desc' },
    });
    return ok(res, data);
  } catch (err) { next(err); }
});

// ── GET /:id — full order trail ──────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return fail(res, 'Invalid request ID', 400);
    const pr = await prisma.purchaseRequest.findUnique({ where: { request_id: id }, include: DETAIL_INCLUDE });
    if (!pr) return fail(res, 'Purchase request not found', 404);
    if (!canViewRequest(req.user, pr)) return fail(res, 'Access denied', 403);
    return ok(res, pr);
  } catch (err) { next(err); }
});

// ── POST / — faculty creates request (letter mandatory) ──────
// multipart: letter (file), items (JSON: [{ product_id | new_product:{name,unit}, quantity, notes }]), required_date
router.post('/', requireAuth, requireRole('Department User', 'Admin'), upload.single('letter'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, "Upload the principal's letter (PDF or image)", 400);

    const items = parseJson(req.body.items, null);
    if (!Array.isArray(items) || items.length === 0) return fail(res, 'Add at least one item', 400);

    const requiredDate = req.body.required_date ? new Date(req.body.required_date) : null;
    if (!requiredDate || Number.isNaN(requiredDate.getTime())) return fail(res, 'Required-by date is required', 400);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (requiredDate < today) return fail(res, 'Required-by date cannot be in the past', 400);

    for (const [i, item] of items.entries()) {
      const qty = parseInt(item.quantity, 10);
      if (!Number.isInteger(qty) || qty < 1) return fail(res, `Item ${i + 1}: quantity must be at least 1`, 400);
      if (!parseId(item.product_id) && !item.new_product?.name?.trim()) {
        return fail(res, `Item ${i + 1}: pick a product or enter a new product name`, 400);
      }
    }

    const pr = await prisma.$transaction(async (tx) => {
      let general = null;
      const rows = [];
      for (const item of items) {
        let productId = parseId(item.product_id);
        if (productId) {
          const exists = await tx.product.findUnique({ where: { product_id: productId }, select: { product_id: true } });
          if (!exists) throw Object.assign(new Error('Selected product not found'), { status: 400 });
        } else {
          if (!general) {
            general = await tx.category.findFirst({ where: { name: 'General' } })
              || await tx.category.create({ data: { name: 'General', description: 'Items added from requests' } });
          }
          const created = await tx.product.create({
            data: {
              category_id: general.category_id,
              sku: `PROD-${Date.now().toString(36).toUpperCase()}-${rows.length}`,
              name: item.new_product.name.trim(),
              unit: item.new_product.unit?.trim() || 'piece',
              unit_price: 0,
            },
          });
          productId = created.product_id;
        }
        rows.push({ product_id: productId, quantity: parseInt(item.quantity, 10), notes: item.notes?.trim() || null });
      }

      return tx.purchaseRequest.create({
        data: {
          pr_number: await generatePRNumber(req.user.department),
          requested_by: req.user.user_id,
          letter_url: `/uploads/${req.file.filename}`,
          required_date: requiredDate,
          status: 'pending',
          items: { create: rows },
        },
        include: LIST_INCLUDE,
      });
    });

    const hods = await hodsFor(req.user.department);
    notify(hods, {
      type: 'pr_submitted',
      message: `${pr.pr_number} from ${req.user.name} is waiting for approval`,
      email: {
        subject: `Approval needed: ${pr.pr_number}`,
        heading: 'New purchase request',
        rows: [
          ['Request', pr.pr_number],
          ['Requested by', `${req.user.name}${req.user.department ? ` (${req.user.department})` : ''}`],
          ['Items', pr.items.map((i) => `${i.product.name} × ${i.quantity}`).join(', ')],
          ['Required by', requiredDate.toDateString()],
        ],
        cta: { label: 'Review request', url: `${FRONTEND_URL()}/purchase-requests?id=${pr.request_id}` },
      },
    });

    return ok(res, pr, `Request ${pr.pr_number} submitted`, 201);
  } catch (err) {
    if (err.status) return fail(res, err.message, err.status);
    next(err);
  }
});

// ── PUT /:id/approve | /:id/reject — HOD of the department ──
async function decide(req, res, next, action) {
  try {
    const pr = await loadForManage(req, res);
    if (!pr) return;
    if (pr.status !== 'pending') return fail(res, `Request is already ${pr.status}`, 400);

    const comments = String(req.body.comments || req.body.reason || '').trim() || null;
    if (action === 'rejected' && !comments) return fail(res, 'Give a reason for rejection', 400);

    await prisma.$transaction([
      prisma.purchaseRequest.update({
        where: { request_id: pr.request_id },
        data: { status: action, admin_remarks: comments },
      }),
      prisma.approvalLog.create({
        data: { request_id: pr.request_id, approver_id: req.user.user_id, action, comments },
      }),
    ]);

    notify([pr.user], {
      type: `pr_${action}`,
      message: `${pr.pr_number} was ${action}${comments ? `: ${comments}` : ''}`,
      email: {
        subject: `${pr.pr_number} ${action}`,
        heading: `Your request was ${action}`,
        rows: [['Request', pr.pr_number], ['By', req.user.name], ['Remarks', comments]],
        cta: { label: 'Open request', url: `${FRONTEND_URL()}/purchase-requests?id=${pr.request_id}` },
      },
    });

    return ok(res, null, `Request ${action}`);
  } catch (err) { next(err); }
}

router.put('/:id/approve', requireAuth, requireRole('Admin'), (req, res, next) => decide(req, res, next, 'approved'));
router.put('/:id/reject', requireAuth, requireRole('Admin'), (req, res, next) => decide(req, res, next, 'rejected'));

// ── POST /:id/rfq — send product details to vendors ─────────
// body: { vendor_ids: [int], emails: [string], closes_at: ISO date }
// Unknown emails get a vendor record + invite link (instant access).
// Can be called again while the RFQ is open to add more vendors / extend the date.
router.post('/:id/rfq', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const pr = await loadForManage(req, res);
    if (!pr) return;
    if (!['approved', 'rfq_sent'].includes(pr.status)) return fail(res, 'Only approved requests can be sent to vendors', 400);

    const closesAt = new Date(req.body.closes_at);
    if (Number.isNaN(closesAt.getTime())) return fail(res, 'Set a closing date for quotations', 400);
    if (closesAt <= new Date()) return fail(res, 'Closing date must be in the future', 400);

    const vendorIds = [...new Set((req.body.vendor_ids || []).map(parseId).filter(Boolean))];
    const emails = [...new Set((req.body.emails || []).map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
    const badEmail = emails.find((e) => !EMAIL_RE.test(e));
    if (badEmail) return fail(res, `Invalid email: ${badEmail}`, 400);
    if (!vendorIds.length && !emails.length) return fail(res, 'Pick at least one vendor or enter an email', 400);

    const vendors = [];
    for (const id of vendorIds) {
      const v = await prisma.vendor.findUnique({ where: { vendor_id: id } });
      if (!v) return fail(res, `Vendor ${id} not found`, 404);
      if (v.is_blacklisted) return fail(res, `${v.vendor_name} is blacklisted`, 400);
      vendors.push(v);
    }
    for (const email of emails) {
      let v = await prisma.vendor.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
      if (v?.is_blacklisted) return fail(res, `${email} is blacklisted`, 400);
      if (!v) {
        v = await prisma.vendor.create({
          data: { vendor_name: email.split('@')[0], email, status: 'invited' },
        });
      }
      if (!vendors.some((x) => x.vendor_id === v.vendor_id)) vendors.push(v);
    }

    const sent = [];
    for (const v of vendors) {
      const existing = await prisma.vendorRFQ.findFirst({ where: { request_id: pr.request_id, vendor_id: v.vendor_id } });
      if (!existing) {
        await prisma.vendorRFQ.create({
          data: { request_id: pr.request_id, vendor_id: v.vendor_id, sent_by: req.user.user_id },
        });
      }

      // Vendors without a login get (or refresh) an invite link.
      let link = `${FRONTEND_URL()}/vendor-portal`;
      if (!v.user_id) {
        const token = newInviteToken();
        await prisma.vendor.update({
          where: { vendor_id: v.vendor_id },
          data: { invite_token: token, invite_expires_at: new Date(Date.now() + INVITE_DAYS * 864e5) },
        });
        link = `${FRONTEND_URL()}/vendor-invite/${token}`;
      }

      notify([{ user_id: v.user_id || undefined, email: v.email }], {
        type: 'rfq_received',
        message: `Quotation requested for ${pr.pr_number} (closes ${closesAt.toDateString()})`,
        email: {
          subject: `Request for quotation: ${pr.pr_number}`,
          heading: 'Request for quotation',
          intro: 'Please quote a price per item and your expected delivery date.',
          rows: [
            ['Reference', pr.pr_number],
            ['Items', pr.items.map((i) => `${i.product.name} × ${i.quantity} ${i.product.unit}${i.notes ? ` (${i.notes})` : ''}`).join('; ')],
            ['Needed by', pr.required_date ? pr.required_date.toDateString() : null],
            ['Quotes close', closesAt.toString()],
          ],
          cta: { label: v.user_id ? 'Submit quotation' : 'Accept invite and quote', url: link },
        },
      });
      sent.push({ vendor_id: v.vendor_id, vendor_name: v.vendor_name, email: v.email, invited: !v.user_id, new: !existing });
    }

    await prisma.purchaseRequest.update({
      where: { request_id: pr.request_id },
      data: { status: 'rfq_sent', rfq_closes_at: closesAt },
    });

    return ok(res, sent, `RFQ sent to ${sent.length} vendor(s)`);
  } catch (err) { next(err); }
});

module.exports = router;

// Work orders (v3) — read only.
// A work order is created when the HOD selects a quotation (see quotations.routes.js).
// Deliveries against it are Shipments (see shipments.routes.js).
const express = require('express');
const prisma = require('../../config/db');
const { requireAuth } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { quantityLedger, unitPriceMap, canViewRequest } = require('../../utils/orderCycle');

const router = express.Router();

const INCLUDE = {
  vendor: { select: { vendor_id: true, vendor_name: true, company_name: true, email: true, phone: true, address: true } },
  creator: { select: { name: true, department: true } },
  submission: { select: { submission_id: true, quotation_file_url: true, total_price: true, expected_delivery: true, items: true } },
  request: {
    select: {
      request_id: true, pr_number: true, requested_by: true, required_date: true, status: true,
      user: { select: { user_id: true, name: true, department: true } },
      items: { include: { product: { select: { product_id: true, name: true, unit: true } } } },
    },
  },
  shipments: {
    include: { items: true, gate_checks: { orderBy: { checked_at: 'desc' } } },
    orderBy: { created_at: 'asc' },
  },
};

function scope(user) {
  if (user.role === 'Vendor') return { vendor_id: user.vendor_id || -1 };
  if (user.role === 'Department User') return { request: { requested_by: user.user_id } };
  if (user.role === 'Admin' && user.department) {
    return { request: { user: { department: { equals: user.department, mode: 'insensitive' } } } };
  }
  return {};
}

function decorate(wo, user) {
  const prices = unitPriceMap(wo);
  const out = {
    ...wo,
    ledger: quantityLedger(wo).map((l) => ({ ...l, unit_price: prices.get(l.request_item_id) })),
  };
  // Vendors do not need requester details; gate codes are only for the vendor & HOD.
  if (user.role === 'Vendor') out.request = { ...out.request, user: undefined, requested_by: undefined };
  if (!['Vendor', 'Admin'].includes(user.role)) {
    out.shipments = out.shipments.map((s) => ({ ...s, gate_code: undefined }));
  }
  return out;
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = scope(req.user);
    if (req.query.status) where.status = { in: String(req.query.status).split(',') };
    const data = await prisma.workOrder.findMany({ where, include: INCLUDE, orderBy: { created_at: 'desc' } });
    return ok(res, data.map((wo) => decorate(wo, req.user)));
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) return fail(res, 'Invalid work order ID', 400);
    const wo = await prisma.workOrder.findUnique({ where: { wo_id: id }, include: INCLUDE });
    if (!wo) return fail(res, 'Work order not found', 404);
    const allowed = req.user.role === 'Vendor'
      ? wo.vendor_id === req.user.vendor_id
      : canViewRequest(req.user, { ...wo.request, user: wo.request.user });
    if (!allowed) return fail(res, 'Access denied', 403);
    return ok(res, decorate(wo, req.user));
  } catch (err) { next(err); }
});

module.exports = router;

// Subscriptions — software licences and recurring services bought by a department
// (Microsoft 365, Adobe Photoshop, Claude, antivirus, AMC contracts...).
// Standalone records: no inventory product needed.
//   GET    /             list (department scoped; ?department= for super admin)
//   POST   /             HOD / super admin add (multipart: optional `document` = invoice)
//   PUT    /:id          edit
//   POST   /:id/renew    record a renewal → next date (default: one billing cycle on)
//   DELETE /:id
// Reminders: src/utils/tracker.js
const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { ok, fail } = require('../../utils/response');
const { inventoryScope } = require('../../utils/departments');
const { BILLING_CYCLES, enrichSubscription, remindSubscription, nextRenewal } = require('../../utils/tracker');
const { parseId, parseDate, text, departmentFor, canEdit, appendNote } = require('../warranties/tracker.helpers');

const router = express.Router();

const remindSoon = (s) => remindSubscription(s).catch((e) => console.warn('[TRACKER]', e.message));

const bool = (v) => v === true || v === 'true' || v === '1' || v === 'on';

function readBody(body, partial) {
  const data = {};
  const errors = [];
  const has = (k) => !partial || body[k] !== undefined;

  if (has('service_name')) {
    const name = text(body.service_name);
    if (!name) errors.push('Enter the service name');
    else data.service_name = name;
  }
  if (has('expiry_date')) {
    const d = parseDate(body.expiry_date);
    if (!d) errors.push('Enter the renewal / expiry date');
    else data.expiry_date = d;
  }
  for (const k of ['provider', 'plan', 'notes']) if (body[k] !== undefined) data[k] = text(body[k]);
  if (body.start_date !== undefined) data.start_date = parseDate(body.start_date);
  if (body.auto_renew !== undefined) data.auto_renew = bool(body.auto_renew);
  if (body.billing_cycle !== undefined && body.billing_cycle !== '') {
    if (!BILLING_CYCLES.includes(body.billing_cycle)) errors.push('Unknown billing cycle');
    else data.billing_cycle = body.billing_cycle;
  }
  if (body.seats !== undefined) {
    if (body.seats === '' || body.seats === null) data.seats = null;
    else {
      const n = parseInt(body.seats, 10);
      if (!Number.isInteger(n) || n < 1) errors.push('Seats must be 1 or more');
      else data.seats = n;
    }
  }
  if (body.cost !== undefined) {
    if (body.cost === '' || body.cost === null) data.cost = null;
    else {
      const n = Number(body.cost);
      if (!Number.isFinite(n) || n < 0) errors.push('Cost must be a positive amount');
      else data.cost = Math.round(n * 100) / 100;
    }
  }
  return { data, errors };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.subscription.findMany({
      where: inventoryScope(req.user, req.query.department),
      orderBy: { expiry_date: 'asc' },
    });
    return ok(res, rows.map(enrichSubscription));
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('Admin'), upload.single('document'), async (req, res, next) => {
  try {
    const department = departmentFor(req.user, req.body.department);
    if (!department) return fail(res, 'Choose the department this subscription belongs to', 400);
    const { data, errors } = readBody(req.body, false);
    if (!errors.length && data.start_date && data.expiry_date < data.start_date) errors.push('Renewal date must be after the start date');
    if (errors.length) return fail(res, errors[0], 400);

    const created = await prisma.subscription.create({
      data: {
        ...data,
        department,
        created_by: req.user.user_id,
        document_url: req.file ? `/uploads/${req.file.filename}` : null,
      },
    });
    remindSoon(created);
    return ok(res, enrichSubscription(created), 'Subscription added');
  } catch (err) { next(err); }
});

router.put('/:id', requireAuth, requireRole('Admin'), upload.single('document'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = id && await prisma.subscription.findUnique({ where: { subscription_id: id } });
    if (!current) return fail(res, 'Subscription not found', 404);
    if (!canEdit(req.user, current.department)) return fail(res, 'This subscription belongs to another department', 403);

    const { data, errors } = readBody(req.body, true);
    const start = data.start_date !== undefined ? data.start_date : current.start_date;
    const end = data.expiry_date || current.expiry_date;
    if (!errors.length && start && end < start) errors.push('Renewal date must be after the start date');
    if (errors.length) return fail(res, errors[0], 400);
    if (req.file) data.document_url = `/uploads/${req.file.filename}`;
    if (data.expiry_date && +data.expiry_date !== +current.expiry_date) data.last_reminder = null;
    if (req.body.department !== undefined && !req.user.department) {
      const dept = departmentFor(req.user, req.body.department);
      if (!dept) return fail(res, 'Unknown department', 400);
      data.department = dept;
    }

    const updated = await prisma.subscription.update({ where: { subscription_id: id }, data });
    remindSoon(updated);
    return ok(res, enrichSubscription(updated), 'Subscription updated');
  } catch (err) { next(err); }
});

// body: { expiry_date?, cost?, seats?, notes? } — renewal paid.
// Without expiry_date the next date is one billing cycle after the current one.
router.post('/:id/renew', requireAuth, requireRole('Admin'), upload.single('document'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = id && await prisma.subscription.findUnique({ where: { subscription_id: id } });
    if (!current) return fail(res, 'Subscription not found', 404);
    if (!canEdit(req.user, current.department)) return fail(res, 'This subscription belongs to another department', 403);

    // A lapsed subscription renewed late starts its new cycle today.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const base = current.expiry_date < today ? today : current.expiry_date;
    const next = parseDate(req.body.expiry_date) || nextRenewal(base, current.billing_cycle);
    if (!next) return fail(res, 'Enter the new end date (one-time purchases have no billing cycle)', 400);
    if (next <= current.expiry_date) return fail(res, 'The new renewal date must be after the current one', 400);

    const { data, errors } = readBody(
      { cost: req.body.cost, seats: req.body.seats },
      true,
    );
    if (errors.length) return fail(res, errors[0], 400);

    const updated = await prisma.subscription.update({
      where: { subscription_id: id },
      data: {
        ...data,
        notes: appendNote(current.notes, req.body.notes, 'Renewed'),
        start_date: base,
        expiry_date: next,
        renewed_at: new Date(),
        last_reminder: null,
        ...(req.file ? { document_url: `/uploads/${req.file.filename}` } : {}),
      },
    });
    remindSoon(updated);
    return ok(res, enrichSubscription(updated), 'Renewal recorded');
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = id && await prisma.subscription.findUnique({ where: { subscription_id: id }, select: { department: true } });
    if (!current) return fail(res, 'Subscription not found', 404);
    if (!canEdit(req.user, current.department)) return fail(res, 'This subscription belongs to another department', 403);
    await prisma.subscription.delete({ where: { subscription_id: id } });
    return ok(res, null, 'Subscription deleted');
  } catch (err) { next(err); }
});

module.exports = router;

// Warranties — coverage windows for purchased equipment.
//   GET    /             list (department scoped; ?department= for super admin)
//   POST   /             HOD / super admin add (multipart: optional `document`)
//   PUT    /:id          edit
//   POST   /:id/renew    new end date (extension bought) → reminders restart
//   DELETE /:id
// Warranties are also created automatically at goods review (shipments.routes.js).
// Reminders: src/utils/tracker.js
const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { ok, fail } = require('../../utils/response');
const { inventoryScope } = require('../../utils/departments');
const { enrichWarranty, remindWarranty } = require('../../utils/tracker');
const { parseId, parseDate, text, departmentFor, canEdit, appendNote } = require('./tracker.helpers');

const router = express.Router();

const INCLUDE = {
  product: { select: { product_id: true, name: true, sku: true } },
  vendor: { select: { vendor_id: true, vendor_name: true, email: true, phone: true } },
  wo: { select: { wo_id: true, wo_number: true } },
  shipment: { select: { shipment_id: true, shipment_number: true } },
};

const load = (id) => prisma.warranty.findUnique({ where: { warranty_id: id }, include: INCLUDE });

// Reminder for a record that is already inside the window (e.g. added 5 days
// before expiry) goes out straight away instead of at the next daily run.
const remindSoon = (w) => remindWarranty(w).catch((e) => console.warn('[TRACKER]', e.message));

function readBody(body, partial) {
  const data = {};
  const errors = [];
  if (!partial || body.product_id !== undefined) {
    const id = parseId(body.product_id);
    if (!id) errors.push('Choose the product');
    else data.product_id = id;
  }
  if (body.vendor_id !== undefined) data.vendor_id = parseId(body.vendor_id);
  if (body.serial_number !== undefined) data.serial_number = text(body.serial_number);
  if (body.notes !== undefined) data.notes = text(body.notes);
  if (body.quantity !== undefined && body.quantity !== '') {
    const q = parseInt(body.quantity, 10);
    if (!Number.isInteger(q) || q < 1) errors.push('Quantity must be 1 or more');
    else data.quantity = q;
  }
  for (const key of ['start_date', 'end_date']) {
    if (partial && body[key] === undefined) continue;
    const d = parseDate(body[key]);
    if (!d) errors.push(`${key === 'start_date' ? 'Start' : 'End'} date is missing or invalid`);
    else data[key] = d;
  }
  return { data, errors };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rows = await prisma.warranty.findMany({
      where: inventoryScope(req.user, req.query.department),
      include: INCLUDE,
      orderBy: { end_date: 'asc' },
    });
    return ok(res, rows.map(enrichWarranty));
  } catch (err) { next(err); }
});

router.get('/expiring', requireAuth, async (req, res, next) => {
  try {
    const horizon = new Date();
    horizon.setDate(horizon.getDate() + 31);
    const rows = await prisma.warranty.findMany({
      where: { ...inventoryScope(req.user, req.query.department), end_date: { lt: horizon } },
      include: INCLUDE,
      orderBy: { end_date: 'asc' },
    });
    return ok(res, rows.map(enrichWarranty).filter((w) => w.status === 'expiring_soon'));
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('Admin'), upload.single('document'), async (req, res, next) => {
  try {
    const department = departmentFor(req.user, req.body.department);
    if (!department) return fail(res, 'Choose the department this warranty belongs to', 400);
    const { data, errors } = readBody(req.body, false);
    if (!errors.length && data.end_date < data.start_date) errors.push('End date must be after the start date');
    if (errors.length) return fail(res, errors[0], 400);

    const created = await prisma.warranty.create({
      data: {
        ...data,
        department,
        created_by: req.user.user_id,
        document_url: req.file ? `/uploads/${req.file.filename}` : null,
      },
      include: INCLUDE,
    });
    remindSoon(created);
    return ok(res, enrichWarranty(created), 'Warranty added');
  } catch (err) {
    if (err.code === 'P2003') return fail(res, 'Product or vendor not found', 400);
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('Admin'), upload.single('document'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = id && await load(id);
    if (!current) return fail(res, 'Warranty not found', 404);
    if (!canEdit(req.user, current.department)) return fail(res, 'This warranty belongs to another department', 403);

    const { data, errors } = readBody(req.body, true);
    const start = data.start_date || current.start_date;
    const end = data.end_date || current.end_date;
    if (!errors.length && end < start) errors.push('End date must be after the start date');
    if (errors.length) return fail(res, errors[0], 400);
    if (req.file) data.document_url = `/uploads/${req.file.filename}`;
    // A moved end date is a new coverage window: restart its reminders.
    if (data.end_date && +data.end_date !== +current.end_date) data.last_reminder = null;
    if (req.body.department !== undefined && !req.user.department) {
      const dept = departmentFor(req.user, req.body.department);
      if (!dept) return fail(res, 'Unknown department', 400);
      data.department = dept;
    }

    const updated = await prisma.warranty.update({ where: { warranty_id: id }, data, include: INCLUDE });
    remindSoon(updated);
    return ok(res, enrichWarranty(updated), 'Warranty updated');
  } catch (err) {
    if (err.code === 'P2003') return fail(res, 'Product or vendor not found', 400);
    next(err);
  }
});

// body: { end_date, notes? } — an extension or AMC was bought.
router.post('/:id/renew', requireAuth, requireRole('Admin'), upload.single('document'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = id && await load(id);
    if (!current) return fail(res, 'Warranty not found', 404);
    if (!canEdit(req.user, current.department)) return fail(res, 'This warranty belongs to another department', 403);
    const end = parseDate(req.body.end_date);
    if (!end) return fail(res, 'Enter the new end date', 400);
    if (end <= current.end_date) return fail(res, 'The new end date must be after the current one', 400);

    const updated = await prisma.warranty.update({
      where: { warranty_id: id },
      data: {
        end_date: end,
        last_reminder: null,
        notes: appendNote(current.notes, req.body.notes, 'Extended'),
        ...(req.file ? { document_url: `/uploads/${req.file.filename}` } : {}),
      },
      include: INCLUDE,
    });
    remindSoon(updated);
    return ok(res, enrichWarranty(updated), 'Warranty extended');
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = id && await prisma.warranty.findUnique({ where: { warranty_id: id }, select: { department: true } });
    if (!current) return fail(res, 'Warranty not found', 404);
    if (!canEdit(req.user, current.department)) return fail(res, 'This warranty belongs to another department', 403);
    await prisma.warranty.delete({ where: { warranty_id: id } });
    return ok(res, null, 'Warranty deleted');
  } catch (err) { next(err); }
});

module.exports = router;

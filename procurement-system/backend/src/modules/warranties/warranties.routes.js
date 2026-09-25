const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');

const router = express.Router();

function enrichWarranty(w) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(w.end_date);
  end.setHours(0, 0, 0, 0);
  const days_remaining = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  let status = 'active';
  if (days_remaining < 0) status = 'expired';
  else if (days_remaining <= 30) status = 'expiring_soon';
  else status = 'active';
  return { ...w, days_remaining, status };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const warranties = await prisma.warranty.findMany({
      include: { product: true, vendor: true },
      orderBy: { end_date: 'asc' },
    });
    return ok(res, warranties.map(enrichWarranty));
  } catch (err) {
    next(err);
  }
});

router.get('/expiring', requireAuth, async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDays = new Date(today);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const data = await prisma.warranty.findMany({
      where: {
        end_date: { gte: today, lte: thirtyDays },
      },
      include: { product: true, vendor: true },
    });
    return ok(res, data.map(enrichWarranty));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { product_id, vendor_id, serial_number, start_date, end_date } = req.body;
    if (!product_id || !vendor_id || !start_date || !end_date) {
      return fail(res, 'product_id, vendor_id, start_date, end_date are required', 400);
    }
    const w = await prisma.warranty.create({
      data: {
        product_id: parseInt(product_id, 10),
        vendor_id: parseInt(vendor_id, 10),
        serial_number: serial_number != null ? String(serial_number) : null,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      },
      include: { product: true, vendor: true },
    });
    return ok(res, enrichWarranty(w), 'Warranty created');
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { product_id, vendor_id, serial_number, start_date, end_date } = req.body;
    const data = {};
    if (product_id != null) data.product_id = parseInt(product_id, 10);
    if (vendor_id != null) data.vendor_id = parseInt(vendor_id, 10);
    if (serial_number !== undefined) data.serial_number = serial_number;
    if (start_date) data.start_date = new Date(start_date);
    if (end_date) data.end_date = new Date(end_date);

    const w = await prisma.warranty.update({
      where: { warranty_id: id },
      data,
      include: { product: true, vendor: true },
    });
    return ok(res, enrichWarranty(w), 'Warranty updated');
  } catch (err) {
    if (err.code === 'P2025') return fail(res, 'Warranty not found', 404);
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.warranty.delete({ where: { warranty_id: id } });
    return ok(res, null, 'Warranty deleted');
  } catch (err) {
    if (err.code === 'P2025') return fail(res, 'Warranty not found', 404);
    next(err);
  }
});

module.exports = router;

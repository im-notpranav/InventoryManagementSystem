// Inventory — one stock row per product per department.
//   HOD / faculty: their own department only.
//   Super admin (Admin without department), watchman, accountant: all departments,
//   optionally narrowed with ?department=.
// Accepted goods are added automatically by the goods review (shipments.routes.js).
const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { inventoryScope, normalizeDepartment, isSuperAdmin } = require('../../utils/departments');

const router = express.Router();

const scoped = (req) => inventoryScope(req.user, req.query.department);
const int = (v, d) => (v != null && v !== '' ? parseInt(v, 10) : d);

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await prisma.inventory.findMany({
      where: scoped(req),
      include: { product: { include: { category: true } } },
      orderBy: [{ department: 'asc' }, { inventory_id: 'asc' }],
    });
    return ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/low-stock', requireAuth, async (req, res, next) => {
  try {
    const all = await prisma.inventory.findMany({ where: scoped(req), include: { product: true } });
    return ok(res, all.filter((i) => i.quantity_available <= i.reorder_point));
  } catch (err) {
    next(err);
  }
});

router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const all = await prisma.inventory.findMany({ where: scoped(req), include: { product: true } });
    const lowStock = all.filter((i) => i.quantity_available <= i.reorder_point);
    return ok(res, {
      totalItems: all.reduce((sum, i) => sum + i.quantity_available, 0),
      totalProducts: all.length,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/summary', requireAuth, async (req, res, next) => {
  try {
    const inv = await prisma.inventory.findMany({ where: scoped(req), include: { product: true } });
    let total_value = 0;
    let low_stock_count = 0;
    let out_of_stock_count = 0;
    for (const row of inv) {
      total_value += row.quantity_available * parseFloat(row.product?.unit_price || 0);
      if (row.quantity_available <= 0) out_of_stock_count += 1;
      else if (row.quantity_available <= row.reorder_point) low_stock_count += 1;
    }
    return ok(res, { total_products: inv.length, total_value, low_stock_count, out_of_stock_count });
  } catch (err) {
    next(err);
  }
});

// POST — HOD adds a stock row for their department; super admin picks the department.
router.post('/', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { product_id, quantity_available, reorder_point, min_stock, max_stock } = req.body;
    const productId = int(product_id);
    if (!productId) return fail(res, 'product_id is required', 400);
    const department = isSuperAdmin(req.user) ? normalizeDepartment(req.body.department) : req.user.department;
    if (!department) return fail(res, 'Choose the department this stock belongs to', 400);

    const data = {
      quantity_available: int(quantity_available, 0),
      reorder_point: int(reorder_point, 0),
      min_stock: int(min_stock, 0),
      max_stock: int(max_stock, 999999),
    };
    const row = await prisma.inventory.upsert({
      where: { product_id_department: { product_id: productId, department } },
      update: data,
      create: { ...data, product_id: productId, department },
      include: { product: true },
    });
    return ok(res, row, 'Inventory saved');
  } catch (err) {
    if (err.code === 'P2003') return fail(res, 'Product not found', 400);
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = Number.isInteger(id) && await prisma.inventory.findUnique({ where: { inventory_id: id } });
    if (!row) return fail(res, 'Inventory row not found', 404);
    if (req.user.department && row.department !== req.user.department) {
      return fail(res, 'This stock belongs to another department', 403);
    }
    const { quantity_available, reorder_point, min_stock, max_stock } = req.body;
    const data = {};
    if (quantity_available != null) data.quantity_available = parseInt(quantity_available, 10);
    if (reorder_point != null) data.reorder_point = parseInt(reorder_point, 10);
    if (min_stock != null) data.min_stock = parseInt(min_stock, 10);
    if (max_stock != null) data.max_stock = parseInt(max_stock, 10);

    const updated = await prisma.inventory.update({ where: { inventory_id: id }, data, include: { product: true } });
    return ok(res, updated, 'Inventory updated');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

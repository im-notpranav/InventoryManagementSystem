const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await prisma.inventory.findMany({
      include: {
        product: { include: { category: true } },
        warehouse: true,
      },
      orderBy: { inventory_id: 'asc' },
    });
    return ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.get('/low-stock', requireAuth, async (req, res, next) => {
  try {
    const all = await prisma.inventory.findMany({
      include: { product: true, warehouse: true },
    });
    const low = all.filter((i) => i.quantity_available <= i.reorder_point);
    return ok(res, low);
  } catch (err) {
    next(err);
  }
});

router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const all = await prisma.inventory.findMany({ include: { product: true } });
    const lowStock = all.filter((i) => i.quantity_available <= i.reorder_point);
    const totalItems = all.reduce((sum, i) => sum + i.quantity_available, 0);
    return ok(res, {
      totalItems,
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
    const [products, warehouses, inv] = await Promise.all([
      prisma.product.count(),
      prisma.warehouse.count(),
      prisma.inventory.findMany({ include: { product: true } }),
    ]);
    let total_value = 0;
    let low_stock_count = 0;
    let out_of_stock_count = 0;
    for (const row of inv) {
      const price = parseFloat(row.product?.unit_price || 0);
      total_value += row.quantity_available * price;
      if (row.quantity_available <= 0) out_of_stock_count += 1;
      else if (row.quantity_available <= row.reorder_point) low_stock_count += 1;
    }
    return ok(res, {
      total_products: products,
      total_value,
      low_stock_count,
      out_of_stock_count,
      warehouses,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { product_id, warehouse_id, quantity_available, reorder_point, min_stock, max_stock } = req.body;
    if (!product_id || !warehouse_id) return fail(res, 'product_id and warehouse_id are required', 400);
    const q = quantity_available != null ? parseInt(quantity_available, 10) : 0;
    const rp = reorder_point != null ? parseInt(reorder_point, 10) : 0;
    const mn = min_stock != null ? parseInt(min_stock, 10) : 0;
    const mx = max_stock != null ? parseInt(max_stock, 10) : 999999;

    const existing = await prisma.inventory.findUnique({
      where: {
        product_id_warehouse_id: {
          product_id: parseInt(product_id, 10),
          warehouse_id: parseInt(warehouse_id, 10),
        },
      },
    });

    if (existing) {
      const updated = await prisma.inventory.update({
        where: { inventory_id: existing.inventory_id },
        data: {
          quantity_available: q,
          reorder_point: rp,
          min_stock: mn,
          max_stock: mx,
        },
        include: { product: true, warehouse: true },
      });
      return ok(res, updated, 'Inventory updated');
    }

    const created = await prisma.inventory.create({
      data: {
        product_id: parseInt(product_id, 10),
        warehouse_id: parseInt(warehouse_id, 10),
        quantity_available: q,
        reorder_point: rp,
        min_stock: mn,
        max_stock: mx,
      },
      include: { product: true, warehouse: true },
    });
    return ok(res, created, 'Inventory created');
  } catch (err) {
    next(err);
  }
});

router.put('/:id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { quantity_available, reorder_point, min_stock, max_stock } = req.body;
    const data = {};
    if (quantity_available != null) data.quantity_available = parseInt(quantity_available, 10);
    if (reorder_point != null) data.reorder_point = parseInt(reorder_point, 10);
    if (min_stock != null) data.min_stock = parseInt(min_stock, 10);
    if (max_stock != null) data.max_stock = parseInt(max_stock, 10);

    const updated = await prisma.inventory.update({
      where: { inventory_id: id },
      data,
      include: { product: true, warehouse: true },
    });
    return ok(res, updated, 'Inventory updated');
  } catch (err) {
    if (err.code === 'P2025') return fail(res, 'Inventory row not found', 404);
    next(err);
  }
});

module.exports = router;

const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ include: { category: true } });
    return ok(res, products);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { name, sku, category_id, unit, unit_price, description, is_active } = req.body;
    if (!name || !String(name).trim()) return fail(res, 'Product name is required', 400);
    if (!category_id) return fail(res, 'Category ID is required', 400);
    if (unit_price != null && parseFloat(unit_price) < 0) return fail(res, 'Price cannot be negative', 400);

    const prod = await prisma.product.create({
      data: {
        name: String(name).trim(),
        sku: sku ? String(sku).trim() : `PROD-${Date.now()}`,
        category_id: parseInt(category_id),
        unit: unit ? String(unit).trim() : 'piece',
        unit_price: unit_price != null ? parseFloat(unit_price) : 0,
        description: description ? String(description).trim() : null,
        is_active: is_active !== undefined ? is_active : true,
      }
    });
    return ok(res, prod, 'Product created successfully');
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');

const router = express.Router();

function enrichSubscription(s) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(s.expiry_date);
  exp.setHours(0, 0, 0, 0);
  const days_remaining = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  let status = 'active';
  if (days_remaining < 0) status = 'expired';
  else if (days_remaining <= 30) status = 'expiring_soon';
  return { ...s, days_remaining, status };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const subs = await prisma.subscription.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { expiry_date: 'asc' },
    });
    return ok(res, subs.map(enrichSubscription));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { product_id, service_name, expiry_date, auto_renew } = req.body;
    if (!product_id || !service_name || !expiry_date) {
      return fail(res, 'product_id, service_name, and expiry_date are required', 400);
    }
    const created = await prisma.subscription.create({
      data: {
        product_id: parseInt(product_id, 10),
        service_name: String(service_name),
        expiry_date: new Date(expiry_date),
        auto_renew: Boolean(auto_renew),
      },
      include: { product: true },
    });
    return ok(res, enrichSubscription(created), 'Subscription created');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');

function loadRoute(relPath) {
  try {
    return require(relPath);
  } catch (e) {
    console.error(`[ROUTES] Failed to load ${relPath}:`, e.message);
    const r = express.Router();
    r.all('*', (req, res) =>
      res.status(503).json({ success: false, message: 'Module temporarily unavailable' }),
    );
    return r;
  }
}

const router = express.Router();

router.use('/auth', loadRoute('../modules/auth/auth.routes'));
router.use('/users', loadRoute('../modules/users/users.routes'));
router.use('/roles', loadRoute('../modules/roles/roles.routes'));
router.use('/vendors', loadRoute('../modules/vendors/vendors.routes'));
router.use('/categories', loadRoute('../modules/categories/categories.routes'));
router.use('/products', loadRoute('../modules/products/products.routes'));
router.use('/inventory', loadRoute('../modules/inventory/inventory.routes'));
// Order cycle: request → quotation → work order → shipment (gate, review) → billing
router.use('/purchase-requests', loadRoute('../modules/purchase-requests/purchase-requests.routes'));
router.use('/quotations', loadRoute('../modules/quotations/quotations.routes'));
router.use('/work-orders', loadRoute('../modules/work-orders/work-orders.routes'));
router.use('/shipments', loadRoute('../modules/shipments/shipments.routes'));
router.use('/gate-entry', loadRoute('../modules/gate-entry/gate-entry.routes'));
router.use('/billing', loadRoute('../modules/billing/billing.routes'));
router.use('/warranties', loadRoute('../modules/warranties/warranties.routes'));
router.use('/subscriptions', loadRoute('../modules/subscriptions/subscriptions.routes'));
router.use('/notifications', loadRoute('../modules/notifications/notifications.routes'));
router.use('/chatbot', loadRoute('../modules/chatbot/chatbot.routes'));

module.exports = router;

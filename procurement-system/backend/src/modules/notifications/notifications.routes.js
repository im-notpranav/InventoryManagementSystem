const express = require('express');
const prisma = require('../../config/db');
const { requireAuth } = require('../../middleware/auth.middleware');
const { ok } = require('../../utils/response');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const notifs = await prisma.notification.findMany({
      where: { user_id: req.user.user_id },
      orderBy: { sent_at: 'desc' },
      take: 50
    });
    return ok(res, notifs);
  } catch (err) { next(err); }
});

router.put('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.update({ where: { notification_id: parseInt(req.params.id) }, data: { is_read: true } });
    return ok(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

router.put('/read-all', requireAuth, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({ where: { user_id: req.user.user_id, is_read: false }, data: { is_read: true } });
    return ok(res, null, 'All marked as read');
  } catch (err) { next(err); }
});

module.exports = router;

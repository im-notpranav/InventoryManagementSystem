const express = require('express');
const prisma = require('../../config/db');
const { requireAuth } = require('../../middleware/auth.middleware');
const { ok } = require('../../utils/response');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { role_id: 'asc' },
      select: { role_id: true, role_name: true },
    });
    return ok(res, roles);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

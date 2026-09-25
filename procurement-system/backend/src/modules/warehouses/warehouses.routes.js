const express = require('express');
const prisma = require('../../config/db');
const { requireAuth } = require('../../middleware/auth.middleware');
const { ok } = require('../../utils/response');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await prisma.warehouse.findMany();
    return ok(res, data);
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const prisma = require('../../config/db');
const { requireAuth } = require('../../middleware/auth.middleware');
const { ok } = require('../../utils/response');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const cats = await prisma.category.findMany();
    return ok(res, cats);
  } catch (err) { next(err); }
});

module.exports = router;

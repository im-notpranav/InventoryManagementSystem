const express = require('express');
const router = express.Router();
const { ok } = require('../../utils/response');
const { requireAuth } = require('../../middleware/auth.middleware');

router.get('/', requireAuth, (req, res) => ok(res, []));
module.exports = router;

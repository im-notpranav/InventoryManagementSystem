const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { generatePONumber } = require('../../utils/generateNumbers');
const { sendPOToVendor } = require('../../utils/sendPOToVendor');

const router = express.Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const data = await prisma.purchaseOrder.findMany({
      include: { vendor: true, request: true, order_items: true },
      orderBy: { order_date: 'desc' }
    });
    return ok(res, data);
  } catch (err) { next(err); }
});

router.post('/from-pr/:request_id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { vendor_id, unit_price } = req.body;
    const reqId = parseInt(req.params.request_id);
    
    const pr = await prisma.purchaseRequest.findUnique({ where: { request_id: reqId }, include: { vendor_quotes: true } });
    if (!pr) return fail(res, 'PR not found');
    
    const vendor = await prisma.vendor.findUnique({ where: { vendor_id: parseInt(vendor_id) } });
    const poNum = await generatePONumber(vendor?.vendor_name);

    const total = parseFloat(unit_price) * pr.quantity;

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number: poNum,
        vendor_id: parseInt(vendor_id),
        created_by: req.user.user_id,
        request_id: reqId,
        total_amount: total,
        status: 'issued',
        order_items: {
          create: [{
            product_id: pr.product_id,
            quantity_ordered: pr.quantity,
            unit_price: parseFloat(unit_price),
          }]
        }
      }
    });
    
    await prisma.purchaseRequest.update({ where: { request_id: reqId }, data: { status: 'approved' } });
    
    // Auto email
    sendPOToVendor(po).catch();

    return ok(res, po, 'PO Generated');
  } catch (err) { next(err); }
});

module.exports = router;

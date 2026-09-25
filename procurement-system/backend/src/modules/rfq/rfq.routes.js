const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { sendRFQEmail } = require('../../utils/mailer');

const router = express.Router();

// POST — Send RFQ to vendors for an approved PR
router.post('/send', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { request_id, vendor_ids } = req.body;
    if (!request_id || !vendor_ids || !vendor_ids.length) {
      return fail(res, 'Request ID and at least one vendor are required');
    }

    const pr = await prisma.purchaseRequest.findUnique({
      where: { request_id: parseInt(request_id) },
      include: { product: true }
    });
    if (!pr) return fail(res, 'Purchase request not found', 404);
    if (pr.status !== 'approved') return fail(res, 'PR must be approved before sending RFQ');

    const rfqs = [];
    for (const vid of vendor_ids) {
      const rfq = await prisma.vendorRFQ.create({
        data: {
          request_id: parseInt(request_id),
          vendor_id: parseInt(vid),
          sent_by: req.user.user_id,
          status: 'pending',
        }
      });
      rfqs.push(rfq);

      // Send email to vendor (fire-and-forget)
      try {
        const vendor = await prisma.vendor.findUnique({ where: { vendor_id: parseInt(vid) } });
        if (vendor?.email) {
          await sendRFQEmail({
            to: vendor.email,
            vendorName: vendor.vendor_name,
            productName: pr.product?.name || 'Unknown Product',
            quantity: pr.quantity,
            prNumber: pr.pr_number,
            requiredDate: pr.required_date,
          });
        }
      } catch (mailErr) {
        console.error('[RFQ] Email to vendor failed:', mailErr.message);
      }
    }

    // Update PR status
    await prisma.purchaseRequest.update({
      where: { request_id: parseInt(request_id) },
      data: { status: 'rfq_sent' }
    });

    return ok(res, rfqs, `RFQ sent to ${rfqs.length} vendor(s)`);
  } catch (err) { next(err); }
});

// GET — All RFQs (for admin) or vendor-specific
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const where = {};
    if (req.user.role === 'Vendor') {
      where.vendor_id = req.user.vendor_id;
    }

    const rfqs = await prisma.vendorRFQ.findMany({
      where,
      include: {
        request: { include: { product: true, user: true, warehouse: true } },
        vendor: true,
        sender: { select: { name: true } },
      },
      orderBy: { sent_at: 'desc' }
    });
    return ok(res, rfqs);
  } catch (err) { next(err); }
});

// GET — RFQs for a specific PR (for comparison view)
router.get('/by-request/:request_id', requireAuth, async (req, res, next) => {
  try {
    const rfqs = await prisma.vendorRFQ.findMany({
      where: { request_id: parseInt(req.params.request_id) },
      include: {
        vendor: true,
      },
      orderBy: { sent_at: 'desc' }
    });

    // Also get quote submissions for this PR
    const submissions = await prisma.vendorQuoteSubmission.findMany({
      where: { request_id: parseInt(req.params.request_id) },
      include: { vendor: true },
      orderBy: { submitted_at: 'desc' }
    });

    return ok(res, { rfqs, submissions });
  } catch (err) { next(err); }
});

module.exports = router;

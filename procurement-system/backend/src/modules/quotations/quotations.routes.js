const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { ok, fail } = require('../../utils/response');
const {
  sendRFQEmail,
  sendQuotationApprovedEmail,
  sendQuotationRejectedEmail,
} = require('../../utils/mailer');

const router = express.Router();

const getFileUrl = (files, keys) => {
  for (const key of keys) {
    const file = files?.[key]?.[0];
    if (file?.filename) return `/uploads/${file.filename}`;
  }
  return null;
};

const reviewSubmission = async (submissionId, status, remarks, userId) => {
  const submission = await prisma.vendorQuoteSubmission.findUnique({
    where: { submission_id: submissionId },
    include: {
      vendor: true,
      request: { include: { product: true } },
    },
  });
  if (!submission) return { error: ['Submission not found', 404] };

  if (!['approved', 'rejected'].includes(status)) {
    return { error: ['Status must be approved or rejected', 400] };
  }

  const updated = await prisma.vendorQuoteSubmission.update({
    where: { submission_id: submissionId },
    data: {
      status,
      admin_remarks: remarks || null,
      reviewed_at: new Date(),
      reviewed_by: userId,
    },
    include: {
      vendor: true,
      request: { include: { product: true } },
    },
  });

  try {
    const vendor = updated.vendor;
    const pr = updated.request;
    if (vendor?.email && status === 'approved') {
      await sendQuotationApprovedEmail({
        to: vendor.email,
        vendorName: vendor.vendor_name,
        prNumber: pr?.pr_number || `PR-${updated.request_id}`,
        productName: pr?.product?.name || 'Unknown Product',
      });
    }
    if (vendor?.email && status === 'rejected') {
      await sendQuotationRejectedEmail({
        to: vendor.email,
        vendorName: vendor.vendor_name,
        prNumber: pr?.pr_number || `PR-${updated.request_id}`,
        productName: pr?.product?.name || 'Unknown Product',
        reason: remarks || null,
      });
    }
  } catch (mailErr) {
    console.error('[QUOTATION] Review email failed:', mailErr.message);
  }

  // Update PR status based on review outcome
  try {
    if (submission.request_id) {
      if (status === 'approved') {
        await prisma.purchaseRequest.update({
          where: { request_id: submission.request_id },
          data: { status: 'quotation_approved' },
        });
      }
    }
  } catch (prErr) {
    console.warn('[QUOTATION] PR status update failed:', prErr.message);
  }

  return { updated };
};

router.post(
  '/submit',
  requireAuth,
  requireRole('Vendor'),
  upload.fields([
    { name: 'quotation_file', maxCount: 1 },
    { name: 'proforma_file', maxCount: 1 },
    { name: 'quotation', maxCount: 1 },
    { name: 'proforma', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const { request_id, vendor_id, quoted_price, quoted_quantity, validity_days, notes } = req.body;

      if (!request_id) return fail(res, 'Request ID is required', 400);
      if (!vendor_id) return fail(res, 'vendor_id is required', 400);
      if (parseInt(vendor_id, 10) !== req.user.vendor_id) {
        return fail(res, 'You can only submit quotations for your own vendor account', 403);
      }

      const quotationFileUrl = getFileUrl(req.files, ['quotation_file', 'quotation']);
      const proformaFileUrl = getFileUrl(req.files, ['proforma_file', 'proforma']);

      if (!quotationFileUrl) return fail(res, 'Quotation PDF is required', 400);
      if (!proformaFileUrl) return fail(res, 'Proforma Invoice PDF is required', 400);

      const price = parseFloat(quoted_price);
      if (!quoted_price || Number.isNaN(price) || price <= 0) {
        return fail(res, 'Price must be greater than 0', 400);
      }

      const request = await prisma.purchaseRequest.findUnique({
        where: { request_id: parseInt(request_id, 10) },
      });
      if (!request) return fail(res, 'Purchase request not found', 404);

      const existing = await prisma.vendorQuoteSubmission.findFirst({
        where: {
          request_id: parseInt(request_id, 10),
          vendor_id: req.user.vendor_id,
        },
      });
      if (existing) {
        return fail(res, 'You have already submitted a quotation for this request', 400);
      }

      const submission = await prisma.vendorQuoteSubmission.create({
        data: {
          request_id: parseInt(request_id, 10),
          vendor_id: req.user.vendor_id,
          quotation_file_url: quotationFileUrl,
          proforma_file_url: proformaFileUrl,
          quoted_price: price,
          quoted_quantity: Math.max(1, parseInt(quoted_quantity, 10) || request.quantity || 1),
          validity_days: validity_days ? parseInt(validity_days, 10) : null,
          notes: notes || null,
        },
        include: { vendor: true, request: { include: { product: true } } },
      });

      await prisma.vendorRFQ.updateMany({
        where: {
          request_id: parseInt(request_id, 10),
          vendor_id: req.user.vendor_id,
        },
        data: { status: 'submitted' },
      });

      // Update PR status to quotation_received
      await prisma.purchaseRequest.update({
        where: { request_id: parseInt(request_id, 10) },
        data: { status: 'quotation_received' },
      }).catch(e => console.warn('[QUOTATION] PR status update failed:', e.message));

      return ok(res, submission, 'Quotation submitted successfully');
    } catch (err) {
      next(err);
    }
  },
);

router.post('/send-rfq', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { request_id, vendor_ids } = req.body;
    if (!request_id || !Array.isArray(vendor_ids) || vendor_ids.length === 0) {
      return fail(res, 'Request ID and at least one vendor are required', 400);
    }

    const request = await prisma.purchaseRequest.findUnique({
      where: { request_id: parseInt(request_id, 10) },
      include: { product: true },
    });
    if (!request) return fail(res, 'Purchase request not found', 404);
    if (request.status !== 'approved') return fail(res, 'PR must be approved before sending RFQ', 400);

    const created = [];
    for (const vendorId of vendor_ids) {
      const vId = parseInt(vendorId, 10);
      const rfq = await prisma.vendorRFQ.create({
        data: {
          request_id: request.request_id,
          vendor_id: vId,
          sent_by: req.user.user_id,
          status: 'pending',
        },
      });
      created.push(rfq);

      try {
        const vendor = await prisma.vendor.findUnique({ where: { vendor_id: vId } });
        if (vendor?.email) {
          await sendRFQEmail({
            to: vendor.email,
            vendorName: vendor.vendor_name,
            productName: request.product?.name || 'Unknown Product',
            quantity: request.quantity,
            prNumber: request.pr_number || `PR-${request.request_id}`,
            requiredDate: request.required_date,
          });
        }
      } catch (mailErr) {
        console.error('[QUOTATION] RFQ email failed:', mailErr.message);
      }
    }

    await prisma.purchaseRequest.update({
      where: { request_id: request.request_id },
      data: { status: 'rfq_sent' },
    });

    return ok(res, created, `RFQ sent to ${created.length} vendor(s)`);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const submissionId = parseInt(req.params.id, 10);
    const { remarks } = req.body;
    const result = await reviewSubmission(submissionId, 'approved', remarks, req.user.user_id);
    if (result.error) return fail(res, result.error[0], result.error[1]);
    return ok(res, result.updated, 'Quotation approved');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const submissionId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const result = await reviewSubmission(submissionId, 'rejected', reason, req.user.user_id);
    if (result.error) return fail(res, result.error[0], result.error[1]);
    return ok(res, result.updated, 'Quotation rejected');
  } catch (err) {
    next(err);
  }
});

router.put('/review/:submission_id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const submissionId = parseInt(req.params.submission_id, 10);
    const { status, remarks } = req.body;
    const result = await reviewSubmission(submissionId, status, remarks, req.user.user_id);
    if (result.error) return fail(res, result.error[0], result.error[1]);
    return ok(res, result.updated, 'Submission reviewed');
  } catch (err) {
    next(err);
  }
});

router.get('/vendor/:vendor_id', requireAuth, async (req, res, next) => {
  try {
    const vendorId = parseInt(req.params.vendor_id, 10);
    if (req.user.role === 'Vendor' && req.user.vendor_id !== vendorId) {
      return fail(res, 'Access denied for this vendor', 403);
    }

    const rfqs = await prisma.vendorRFQ.findMany({
      where: { vendor_id: vendorId },
      include: {
        request: {
          include: {
            product: {
              select: { name: true, unit: true, description: true },
            },
          },
        },
      },
      orderBy: { sent_at: 'desc' },
    });

    const submissions = await prisma.vendorQuoteSubmission.findMany({
      where: { vendor_id: vendorId },
      include: { request: { include: { product: true } } },
      orderBy: { submitted_at: 'desc' },
    });

    const submissionMap = new Map(submissions.map((s) => [s.request_id, s]));
    const rfqsWithSubmission = rfqs.map((rfq) => ({
      ...rfq,
      submission: submissionMap.get(rfq.request_id) || null,
    }));

    return ok(res, { rfqs: rfqsWithSubmission, submissions });
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const filter = req.user.role === 'Vendor' ? { vendor_id: req.user.vendor_id } : {};
    const submissions = await prisma.vendorQuoteSubmission.findMany({
      where: filter,
      include: { vendor: true, request: { include: { product: true } } },
      orderBy: { submitted_at: 'desc' },
    });
    return ok(res, submissions);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

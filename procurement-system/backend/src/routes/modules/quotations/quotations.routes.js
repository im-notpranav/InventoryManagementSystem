import { Router } from 'express';
import prisma from '../../../config/db.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import upload from '../../../utils/fileUpload.js';

const router = Router();

const getLinkedVendorId = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vendorId: true },
  });
  return user?.vendorId || null;
};

// POST /api/quotations/send-rfq
// Admin invites vendors to submit quotations
router.post(
  '/send-rfq',
  authMiddleware,
  rbac('Admin', 'Manager'),
  async (req, res, next) => {
    try {
      const { request_id, vendor_ids } = req.body;

      const reqId = parseInt(request_id, 10);
      if (!reqId || !Array.isArray(vendor_ids) || vendor_ids.length === 0) {
        return sendError(res, 'request_id and vendor_ids are required', 400);
      }

      const pr = await prisma.purchaseRequest.findUnique({
        where: { id: reqId },
        include: { items: { include: { product: true } } },
      });
      if (!pr) return sendError(res, 'Purchase request not found.', 404);

      const created = [];

      for (const vid of vendor_ids) {
        const vendorId = parseInt(vid, 10);
        if (!vendorId) continue;

        const existing = await prisma.vendorQuote.findUnique({
          where: { requestId_vendorId: { requestId: reqId, vendorId } },
        });

        if (existing) continue;

        const rfq = await prisma.vendorQuote.create({
          data: {
            requestId: reqId,
            vendorId,
            unitPrice: 0,
            deliveryDays: null,
            validityDate: null,
            resent_at: null,
            notes: null,
            isSelected: false,
          },
          include: { vendor: true, request: true },
        });

        created.push(rfq);
      }

      // Update PR status to rfq_sent
      await prisma.purchaseRequest.update({
        where: { id: reqId },
        data: { status: 'rfq_sent' },
      });

      return sendSuccess(res, created, 'RFQs created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/quotations/submit
// Vendor submits quotation + proforma invoice
router.post('/submit',
  authMiddleware,
  rbac('Vendor'),
  upload.fields([
    { name: 'quotation_file', maxCount: 1 },
    { name: 'proforma_file', maxCount: 1 }
  ]),
  async (req, res, next) => {
    try {
      const { request_id, quoted_price, quoted_quantity, validity_days, notes } = req.body;
      const vendor_id = await getLinkedVendorId(req.user.id);

      if (!request_id || !vendor_id || !quoted_price || !quoted_quantity) {
        return sendError(res, 'Missing required fields: request_id, quoted_price, quoted_quantity', 400);
      }

      const quotationFile = req.files?.quotation_file?.[0];
      const proformaFile = req.files?.proforma_file?.[0];

      if (!quotationFile || !proformaFile) {
        return sendError(res, 'Both quotation file and proforma invoice are required', 400);
      }

      // Verify the PR exists
      const pr = await prisma.purchaseRequest.findUnique({ where: { id: parseInt(request_id) } });
      if (!pr) return sendError(res, 'Purchase request not found.', 404);

      const existing = await prisma.vendorQuoteSubmission.findFirst({
        where: { request_id: parseInt(request_id), vendor_id: parseInt(vendor_id) },
      });
      if (existing) {
        return sendError(res, 'You already submitted a quotation for this request.', 400);
      }

      const submission = await prisma.vendorQuoteSubmission.create({
        data: {
          request_id: parseInt(request_id),
          vendor_id: parseInt(vendor_id),
          quotation_file_url: quotationFile.path,
          proforma_file_url: proformaFile.path,
          quoted_price: parseFloat(quoted_price),
          quoted_quantity: parseInt(quoted_quantity),
          validity_days: validity_days ? parseInt(validity_days) : null,
          notes: notes || null,
        },
        include: { vendor: true, request: true },
      });

      // Update PR status to quotation_received
      await prisma.purchaseRequest.update({
        where: { id: parseInt(request_id) },
        data: { status: 'quotation_received' },
      });

      // Notify admin (console.log stub)
      console.log(`📩 [NOTIFICATION] Vendor ${submission.vendor.name} submitted quotation for PR #${pr.pr_number || pr.requestNo}`);

      return sendSuccess(res, submission, 'Quotation submitted successfully.', 201);
    } catch (error) { next(error); }
  }
);

// GET /api/quotations/request/:request_id
// Admin views all submissions for a PR
router.get('/request/:request_id',
  authMiddleware,
  rbac('Admin', 'Manager'),
  async (req, res, next) => {
    try {
      const submissions = await prisma.vendorQuoteSubmission.findMany({
        where: { request_id: parseInt(req.params.request_id) },
        include: {
          vendor: { select: { id: true, name: true, email: true, phone: true, rating: true } },
          reviewer: { select: { id: true, name: true } },
          request: { select: { id: true, pr_number: true, requestNo: true, status: true } },
        },
        orderBy: { submitted_at: 'desc' },
      });
      return sendSuccess(res, submissions);
    } catch (error) { next(error); }
  }
);

// POST /api/quotations/:id/approve
// Admin approves a submission
router.post('/:id/approve',
  authMiddleware,
  rbac('Admin', 'Manager'),
  async (req, res, next) => {
    try {
      const { admin_remarks, reviewed_by } = req.body;
      const submission = await prisma.vendorQuoteSubmission.update({
        where: { submission_id: parseInt(req.params.id) },
        data: {
          status: 'approved',
          admin_remarks: admin_remarks || null,
          reviewed_at: new Date(),
          reviewed_by: reviewed_by ? parseInt(reviewed_by) : req.user.id,
        },
        include: { vendor: true, request: true },
      });

      // Update PR status
      await prisma.purchaseRequest.update({
        where: { id: submission.request_id },
        data: { status: 'quotation_approved' },
      });

      console.log(`✅ [NOTIFICATION] Quotation from ${submission.vendor.name} approved. Ready for Work Order creation.`);

      return sendSuccess(res, submission, 'Quotation approved successfully.');
    } catch (error) { next(error); }
  }
);

// POST /api/quotations/:id/reject
// Admin rejects a submission
router.post('/:id/reject',
  authMiddleware,
  rbac('Admin', 'Manager'),
  async (req, res, next) => {
    try {
      const { admin_remarks, reviewed_by } = req.body;
      if (!admin_remarks) {
        return sendError(res, 'Remarks are required when rejecting a quotation.', 400);
      }

      const submission = await prisma.vendorQuoteSubmission.update({
        where: { submission_id: parseInt(req.params.id) },
        data: {
          status: 'rejected',
          admin_remarks,
          reviewed_at: new Date(),
          reviewed_by: reviewed_by ? parseInt(reviewed_by) : req.user.id,
        },
        include: { vendor: true },
      });

      return sendSuccess(res, submission, 'Quotation rejected.');
    } catch (error) { next(error); }
  }
);

// GET /api/quotations/vendor/:vendor_id
// Vendor views their own submissions
router.get('/vendor/:vendor_id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const requestedVendorId = parseInt(req.params.vendor_id);
      if (isNaN(requestedVendorId)) return sendError(res, 'Invalid vendor ID.', 400);

      let where = { vendor_id: requestedVendorId };
      if (req.user.role === 'Vendor') {
        const linkedVendorId = await getLinkedVendorId(req.user.id);
        if (!linkedVendorId || linkedVendorId !== requestedVendorId) {
          return sendError(res, 'Access denied.', 403);
        }
      } else if (!['Admin', 'Manager'].includes(req.user.role)) {
        return sendError(res, 'Access denied.', 403);
      }

      // RFQ invitations for this vendor (pending selection)
      const rfqInvitations = await prisma.vendorQuote.findMany({
        where: { vendorId: requestedVendorId },
        include: {
          request: {
            include: {
              items: { include: { product: true } },
            },
          },
          vendor: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const submissions = await prisma.vendorQuoteSubmission.findMany({
        where,
        include: {
          request: {
            include: {
              items: { include: { product: true } },
            },
          },
          work_order: { select: { wo_id: true, wo_number: true, status: true } },
        },
        orderBy: { submitted_at: 'desc' },
      });

      const submittedRequestIds = new Set(submissions.map((s) => s.request_id));

      const mappedRfqs = rfqInvitations
        .filter((inv) => !submittedRequestIds.has(inv.requestId))
        .map((inv) => ({
          rfq_id: inv.id,
          request_id: inv.requestId,
          vendor_id: inv.vendorId,
          status: 'pending',
          pr_number: inv.request?.pr_number || inv.request?.requestNo,
          required_date: inv.request?.requiredDate || null,
          products: (inv.request?.items || []).map((it) => ({
            product_id: it.product_id,
            product_name: it.product?.name || it.customProductName || 'N/A',
            quantity: it.quantity,
          })),
        }));

      return sendSuccess(res, { rfqs: mappedRfqs, submissions });
    } catch (error) { next(error); }
  }
);

// GET /api/quotations
// Admin view for all submissions
router.get('/',
  authMiddleware,
  rbac('Admin', 'Manager'),
  async (req, res, next) => {
    try {
      const submissions = await prisma.vendorQuoteSubmission.findMany({
        include: {
          vendor: { select: { id: true, name: true, email: true } },
          request: {
            include: {
              items: { include: { product: true } },
            },
          },
          reviewer: { select: { id: true, name: true, email: true } },
          work_order: { select: { wo_id: true, wo_number: true, status: true } },
        },
        orderBy: { submitted_at: 'desc' },
      });

      return sendSuccess(res, submissions);
    } catch (error) { next(error); }
  }
);

export default router;

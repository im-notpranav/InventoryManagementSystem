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

// POST /api/work-orders/create
// Admin creates work order after quote approval
router.post('/create',
  authMiddleware,
  rbac('Admin', 'Manager'),
  async (req, res, next) => {
    try {
      const {
        submission_id, request_id, vendor_id,
        items_description, quantity, agreed_price,
        delivery_deadline, terms
      } = req.body;

      if (!submission_id || !request_id || !vendor_id || !items_description || !quantity || !agreed_price || !delivery_deadline) {
        return sendError(res, 'Missing required fields.', 400);
      }

      // Verify submission is approved
      const submission = await prisma.vendorQuoteSubmission.findUnique({
        where: { submission_id: parseInt(submission_id) },
      });
      if (!submission) return sendError(res, 'Quotation submission not found.', 404);
      if (submission.status !== 'approved') {
        return sendError(res, 'Quotation must be approved before creating a work order.', 400);
      }

      // Check no WO exists for this submission already
      const existingWO = await prisma.workOrder.findUnique({
        where: { submission_id: parseInt(submission_id) },
      });
      if (existingWO) {
        return sendError(res, 'A work order already exists for this quotation submission.', 400);
      }

      const year = new Date().getFullYear();
      const count = await prisma.workOrder.count({
        where: { wo_number: { startsWith: `WO-${year}-` } },
      });
      const wo_number = `WO-${year}-${String(count + 1).padStart(4, '0')}`;

      const workOrder = await prisma.workOrder.create({
        data: {
          wo_number,
          submission_id: parseInt(submission_id),
          request_id: parseInt(request_id),
          vendor_id: parseInt(vendor_id),
          created_by: req.user.id,
          items_description,
          quantity: parseInt(quantity),
          agreed_price: parseFloat(agreed_price),
          delivery_deadline: new Date(delivery_deadline),
          terms: terms || null,
          status: 'draft',
        },
        include: { vendor: true, request: true, submission: true },
      });

      return sendSuccess(res, workOrder, 'Work order created successfully.', 201);
    } catch (error) { next(error); }
  }
);

// POST /api/work-orders/:wo_id/issue
// Admin issues the work order to vendor
router.post('/:wo_id/issue',
  authMiddleware,
  rbac('Admin', 'Manager'),
  upload.single('wo_file'),
  async (req, res, next) => {
    try {
      const wo_id = parseInt(req.params.wo_id);
      const updateData = {
        status: 'issued',
      };

      if (req.file) {
        updateData.wo_file_url = req.file.path;
      }

      const workOrder = await prisma.workOrder.update({
        where: { wo_id },
        data: updateData,
        include: { vendor: true },
      });

      await prisma.purchaseRequest.update({
        where: { id: workOrder.request_id },
        data: { status: 'wo_issued' },
      });

      console.log(`Work order ${workOrder.wo_number} issued to vendor`);

      return sendSuccess(res, workOrder, 'Work order issued to vendor.');
    } catch (error) { next(error); }
  }
);

// POST /api/work-orders/:wo_id/acknowledge
// Vendor acknowledges the work order
router.post('/:wo_id/acknowledge',
  authMiddleware,
  rbac('Vendor'),
  async (req, res, next) => {
    try {
      const wo_id = parseInt(req.params.wo_id);
      const wo = await prisma.workOrder.findUnique({ where: { wo_id } });
      if (!wo) return sendError(res, 'Work order not found.', 404);
      if (wo.status !== 'issued') {
        return sendError(res, 'Work order must be in "issued" status to acknowledge.', 400);
      }

      const linkedVendorId = await getLinkedVendorId(req.user.id);
      if (!linkedVendorId || linkedVendorId !== wo.vendor_id) {
        return sendError(res, 'Access denied.', 403);
      }

      const workOrder = await prisma.workOrder.update({
        where: { wo_id },
        data: {
          status: 'acknowledged',
          acknowledged_at: new Date(),
        },
      });

      return sendSuccess(res, workOrder, 'Work order acknowledged.');
    } catch (error) { next(error); }
  }
);

// POST /api/work-orders/:wo_id/dispatch
// Vendor marks as dispatched
router.post('/:wo_id/dispatch',
  authMiddleware,
  rbac('Vendor'),
  upload.single('tax_invoice'),
  async (req, res, next) => {
    try {
      const wo_id = parseInt(req.params.wo_id);
      const { tax_invoice_number, expected_delivery } = req.body;

      if (!req.file) {
        return sendError(res, 'Tax invoice PDF is required before dispatching', 400);
      }
      if (!tax_invoice_number) {
        return sendError(res, 'Tax invoice number is required', 400);
      }

      const wo = await prisma.workOrder.findUnique({ where: { wo_id } });
      if (!wo) return sendError(res, 'Work order not found.', 404);
      if (wo.status !== 'acknowledged') {
        return sendError(res, 'Work order must be acknowledged before dispatching.', 400);
      }

      const linkedVendorId = await getLinkedVendorId(req.user.id);
      if (!linkedVendorId || linkedVendorId !== wo.vendor_id) {
        return sendError(res, 'Access denied.', 403);
      }

      const updateData = {
        status: 'dispatched',
        dispatched_at: new Date(),
        tax_invoice_number,
        expected_delivery: expected_delivery ? new Date(expected_delivery) : null,
      };

      updateData.tax_invoice_url = req.file.path;

      const workOrder = await prisma.workOrder.update({
        where: { wo_id },
        data: updateData,
        include: { vendor: true },
      });

      // Update PR status
      await prisma.purchaseRequest.update({
        where: { id: wo.request_id },
        data: { status: 'dispatched' },
      });

      console.log('Order dispatched with tax invoice');

      return sendSuccess(res, workOrder, 'Order marked as dispatched.');
    } catch (error) { next(error); }
  }
);

// GET /api/work-orders/:wo_id
// Get full work order details
router.get('/:wo_id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const rawParam = req.params.wo_id;
      const parsedId = parseInt(rawParam);

      // Support both:
      // - numeric wo_id (legacy)
      // - string wo_number (spec GateEntry "WO Number" lookup)
      const workOrder = !isNaN(parsedId)
        ? await prisma.workOrder.findUnique({
            where: { wo_id: parsedId },
            include: {
              submission: { include: { vendor: true } },
              request: { include: { user: { select: { id: true, name: true, department: true } }, items: { include: { product: true } } } },
              vendor: true,
              creator: { select: { id: true, name: true } },
              gate_entry: { include: { billing_document: true } },
            },
          })
        : await prisma.workOrder.findUnique({
            where: { wo_number: rawParam },
            include: {
              submission: { include: { vendor: true } },
              request: { include: { user: { select: { id: true, name: true, department: true } }, items: { include: { product: true } } } },
              vendor: true,
              creator: { select: { id: true, name: true } },
              gate_entry: { include: { billing_document: true } },
            },
          });

      if (!workOrder) return sendError(res, 'Work order not found.', 404);
      if (req.user.role === 'Vendor') {
        const linkedVendorId = await getLinkedVendorId(req.user.id);
        if (!linkedVendorId || linkedVendorId !== workOrder.vendor_id) {
          return sendError(res, 'Access denied.', 403);
        }
      } else if (!['Admin', 'Manager', 'Watchman', 'Accountant'].includes(req.user.role)) {
        return sendError(res, 'Access denied.', 403);
      }
      return sendSuccess(res, workOrder);
    } catch (error) { next(error); }
  }
);

// GET /api/work-orders/vendor/:vendor_id
// Vendor sees their work orders
router.get('/vendor/:vendor_id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const vendorId = parseInt(req.params.vendor_id);
      if (isNaN(vendorId)) return sendError(res, 'Invalid vendor ID.', 400);

      if (req.user.role === 'Vendor') {
        const linkedVendorId = await getLinkedVendorId(req.user.id);
        if (!linkedVendorId || linkedVendorId !== vendorId) {
          return sendError(res, 'Access denied.', 403);
        }
      } else if (!['Admin', 'Manager'].includes(req.user.role)) {
        return sendError(res, 'Access denied.', 403);
      }

      const workOrders = await prisma.workOrder.findMany({
        where: { vendor_id: vendorId },
        include: {
          request: { select: { id: true, pr_number: true, requestNo: true } },
          gate_entry: { select: { entry_id: true, entry_number: true, status: true } },
        },
        orderBy: { created_at: 'desc' },
      });
      return sendSuccess(res, workOrders);
    } catch (error) { next(error); }
  }
);

// GET /api/work-orders
// Admin sees all work orders
router.get('/',
  authMiddleware,
  rbac('Admin', 'Manager'),
  async (req, res, next) => {
    try {
      const workOrders = await prisma.workOrder.findMany({
        include: {
          vendor: { select: { id: true, name: true, email: true } },
          request: { select: { id: true, pr_number: true, requestNo: true, priority: true } },
          creator: { select: { id: true, name: true } },
          gate_entry: { select: { entry_id: true, entry_number: true, status: true } },
        },
        orderBy: { created_at: 'desc' },
      });
      return sendSuccess(res, workOrders);
    } catch (error) { next(error); }
  }
);

export default router;

const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { ok, fail } = require('../../utils/response');
const { generateWONumber } = require('../../utils/generateNumbers');
const { sendWorkOrderEmail } = require('../../utils/mailer');

const router = express.Router();

const baseInclude = {
  vendor: true,
  request: { include: { product: true } },
  gate_entry: { include: { billing_document: true } },
  submission: true,
};

const acknowledgeWorkOrder = async (woId, vendorId) => {
  const wo = await prisma.workOrder.findUnique({ where: { wo_id: woId } });
  if (!wo) return { error: ['Work order not found', 404] };
  if (wo.vendor_id !== vendorId) return { error: ['Access denied for this work order', 403] };
  if (!['issued', 'acknowledged'].includes(wo.status)) {
    return { error: ['Only issued work orders can be acknowledged', 400] };
  }

  const updated = await prisma.workOrder.update({
    where: { wo_id: woId },
    data: {
      status: 'acknowledged',
      acknowledged_at: wo.acknowledged_at || new Date(),
    },
    include: baseInclude,
  });
  return { updated };
};

const dispatchWorkOrder = async (woId, vendorId, body, file) => {
  const wo = await prisma.workOrder.findUnique({ where: { wo_id: woId } });
  if (!wo) return { error: ['Work order not found', 404] };
  if (wo.vendor_id !== vendorId) return { error: ['Access denied for this work order', 403] };
  if (wo.status !== 'acknowledged') return { error: ['Please acknowledge WO first', 400] };
  if (!file?.filename) return { error: ['Tax Invoice PDF is required', 400] };
  if (!body.tax_invoice_number?.trim()) return { error: ['Tax invoice number is required', 400] };

  const updated = await prisma.$transaction(async (tx) => {
    const updatedWo = await tx.workOrder.update({
      where: { wo_id: woId },
      data: {
        tax_invoice_url: `/uploads/${file.filename}`,
        tax_invoice_number: body.tax_invoice_number.trim(),
        expected_delivery: body.expected_delivery ? new Date(body.expected_delivery) : wo.expected_delivery,
        status: 'dispatched',
        dispatched_at: new Date(),
      },
      include: baseInclude,
    });

    if (wo.request_id) {
      await tx.purchaseRequest.update({
        where: { request_id: wo.request_id },
        data: { status: 'dispatched' },
      });
    }

    return updatedWo;
  });

  return { updated };
};

// POST /create — Create work order (requires submission_id)
router.post(
  '/create',
  requireAuth,
  requireRole('Admin', 'Department User'),
  upload.single('wo_file'),
  async (req, res) => {
    try {
      const { submission_id, items_description, quantity, agreed_price, delivery_deadline, terms } = req.body;

      // ── Input validation ──
      if (!submission_id || isNaN(parseInt(submission_id, 10))) {
        return fail(res, 'A valid submission_id is required', 400);
      }
      if (!quantity || isNaN(parseInt(quantity, 10)) || parseInt(quantity, 10) <= 0) {
        return fail(res, 'Quantity must be a positive number', 400);
      }
      if (agreed_price == null || agreed_price === '' || isNaN(parseFloat(agreed_price)) || parseFloat(agreed_price) < 0) {
        return fail(res, 'A valid agreed_price is required (must be >= 0)', 400);
      }
      if (!delivery_deadline || isNaN(new Date(delivery_deadline).getTime())) {
        return fail(res, 'A valid delivery_deadline date is required', 400);
      }
      if (!items_description || !String(items_description).trim()) {
        return fail(res, 'items_description is required', 400);
      }

      const submission = await prisma.vendorQuoteSubmission.findUnique({
        where: { submission_id: parseInt(submission_id, 10) },
        include: { request: { include: { user: true, product: true } }, vendor: true, work_order: true },
      });
      if (!submission) return fail(res, 'Submission not found', 404);

      // Prevent duplicate WO for the same submission (submission_id is @unique in WorkOrder)
      if (submission.work_order) {
        return res.status(409).json({
          success: false,
          message: `A Work Order (${submission.work_order.wo_number}) already exists for this quotation. You cannot create another one.`,
          existing_wo: {
            wo_number: submission.work_order.wo_number,
            wo_id: submission.work_order.wo_id,
            status: submission.work_order.status,
          }
        });
      }

      const woNumber = await generateWONumber(submission.request?.user?.department);
      const woFileUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const wo = await prisma.workOrder.create({
        data: {
          wo_number: woNumber,
          submission_id: parseInt(submission_id, 10),
          request_id: submission.request_id,
          vendor_id: submission.vendor_id,
          created_by: req.user.user_id,
          wo_file_url: woFileUrl,
          items_description: String(items_description).trim(),
          quantity: parseInt(quantity, 10),
          agreed_price: parseFloat(agreed_price),
          delivery_deadline: new Date(delivery_deadline),
          terms: terms || null,
          status: 'issued',
        },
        include: baseInclude,
      });

      // Update PR status to 'wo_issued' if request_id exists
      if (submission.request_id) {
        await prisma.purchaseRequest.update({
          where: { request_id: submission.request_id },
          data: { status: 'wo_issued' }
        }).catch(e => console.warn('[WO] PR status update failed:', e.message));
      }

      try {
        if (submission.vendor?.email) {
          await sendWorkOrderEmail({
            to: submission.vendor.email,
            vendorName: submission.vendor.vendor_name,
            woNumber,
            itemsDescription: String(items_description).trim(),
            quantity: parseInt(quantity, 10),
            agreedPrice: parseFloat(agreed_price),
            deliveryDeadline: delivery_deadline,
          });
        }
      } catch (mailErr) {
        console.error('[WO] Work order email failed:', mailErr.message);
      }

      console.log(`[WO] Created ${wo.wo_number} for vendor ${wo.vendor?.vendor_name}`);

      return res.status(201).json({
        success: true,
        message: `Work Order ${wo.wo_number} created successfully`,
        data: wo
      });
    } catch (err) {
      console.error('[WO CREATE ERROR]', err.message);
      console.error('[WO CREATE STACK]', err.stack);

      if (err.code === 'P2002') {
        // Unique constraint violation
        const field = err.meta?.target?.join(', ') || 'unknown field';
        if (field.includes('submission_id')) {
          return res.status(409).json({
            success: false,
            message: 'A work order already exists for this quotation submission. Each approved quotation can only have one work order.'
          });
        }
        if (field.includes('wo_number')) {
          return res.status(409).json({
            success: false,
            message: 'Work order number conflict. Please try again.'
          });
        }
        return res.status(409).json({
          success: false,
          message: `Duplicate entry: ${field}. This record may already exist.`
        });
      }

      if (err.code === 'P2003') {
        return res.status(400).json({
          success: false,
          message: 'Invalid vendor or submission reference. Please check your selections.'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create work order. Please try again.',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  },
);

// POST /:id/issue — Issue a draft work order
router.post('/:id/issue', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const woId = parseInt(req.params.id, 10);
    if (isNaN(woId) || woId <= 0) {
      return fail(res, 'Invalid work order ID format', 400);
    }
    const wo = await prisma.workOrder.findUnique({
      where: { wo_id: woId },
      include: { vendor: true },
    });
    if (!wo) return fail(res, 'Work order not found', 404);

    const updated = await prisma.workOrder.update({
      where: { wo_id: woId },
      data: { status: 'issued' },
      include: baseInclude,
    });

    try {
      if (updated.vendor?.email) {
        await sendWorkOrderEmail({
          to: updated.vendor.email,
          vendorName: updated.vendor.vendor_name,
          woNumber: updated.wo_number,
          itemsDescription: updated.items_description,
          quantity: updated.quantity,
          agreedPrice: updated.agreed_price,
          deliveryDeadline: updated.delivery_deadline,
        });
      }
    } catch (mailErr) {
      console.error('[WO] Issue email failed:', mailErr.message);
    }

    return ok(res, updated, 'Work order issued');
  } catch (err) {
    console.error('[WO ISSUE ERROR]', err.message);
    console.error('[WO ISSUE STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to issue work order' });
  }
});

// POST /:id/acknowledge — Vendor acknowledges a work order
router.post('/:id/acknowledge', requireAuth, requireRole('Vendor'), async (req, res) => {
  try {
    const woId = parseInt(req.params.id, 10);
    if (isNaN(woId) || woId <= 0) {
      return fail(res, 'Invalid work order ID format', 400);
    }
    const result = await acknowledgeWorkOrder(woId, req.user.vendor_id);
    if (result.error) return fail(res, result.error[0], result.error[1]);
    return ok(res, result.updated, 'Work order acknowledged');
  } catch (err) {
    console.error('[WO ACK ERROR]', err.message);
    console.error('[WO ACK STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to acknowledge work order' });
  }
});

// PUT /acknowledge/:wo_id — Vendor acknowledges (alternate route)
router.put('/acknowledge/:wo_id', requireAuth, requireRole('Vendor'), async (req, res) => {
  try {
    const woId = parseInt(req.params.wo_id, 10);
    if (isNaN(woId) || woId <= 0) {
      return fail(res, 'Invalid work order ID format', 400);
    }
    const result = await acknowledgeWorkOrder(woId, req.user.vendor_id);
    if (result.error) return fail(res, result.error[0], result.error[1]);
    return ok(res, result.updated, 'Work order acknowledged');
  } catch (err) {
    console.error('[WO ACK-PUT ERROR]', err.message);
    console.error('[WO ACK-PUT STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to acknowledge work order' });
  }
});

// POST /:id/dispatch — Vendor dispatches with tax invoice
router.post('/:id/dispatch', requireAuth, requireRole('Vendor'), upload.single('tax_invoice'), async (req, res) => {
  try {
    const woId = parseInt(req.params.id, 10);
    if (isNaN(woId) || woId <= 0) {
      return fail(res, 'Invalid work order ID format', 400);
    }
    const result = await dispatchWorkOrder(woId, req.user.vendor_id, req.body, req.file);
    if (result.error) return fail(res, result.error[0], result.error[1]);
    return ok(res, result.updated, 'Work order dispatched');
  } catch (err) {
    console.error('[WO DISPATCH ERROR]', err.message);
    console.error('[WO DISPATCH STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to dispatch work order' });
  }
});

// PUT /dispatch/:wo_id — Vendor dispatches (alternate route)
router.put('/dispatch/:wo_id', requireAuth, requireRole('Vendor'), upload.single('tax_invoice'), async (req, res) => {
  try {
    const woId = parseInt(req.params.wo_id, 10);
    if (isNaN(woId) || woId <= 0) {
      return fail(res, 'Invalid work order ID format', 400);
    }
    const result = await dispatchWorkOrder(woId, req.user.vendor_id, req.body, req.file);
    if (result.error) return fail(res, result.error[0], result.error[1]);
    return ok(res, result.updated, 'Work order dispatched');
  } catch (err) {
    console.error('[WO DISPATCH-PUT ERROR]', err.message);
    console.error('[WO DISPATCH-PUT STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to dispatch work order' });
  }
});

// GET /dispatched — all dispatched work orders (for Watchman gate entry)
router.get('/dispatched', requireAuth, requireRole('Watchman', 'Admin'), async (req, res) => {
  try {
    const data = await prisma.workOrder.findMany({
      where: { status: 'dispatched' },
      include: {
        vendor: { select: { vendor_id: true, vendor_name: true, email: true } },
        request: { include: { product: { select: { name: true, unit: true } } } },
        gate_entry: true,
      },
      orderBy: { dispatched_at: 'desc' },
    });
    // Filter out WOs that already have a gate entry
    const available = data.filter((wo) => !wo.gate_entry);
    return ok(res, available);
  } catch (err) {
    console.error('[WO DISPATCHED ERROR]', err.message);
    console.error('[WO DISPATCHED STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to load dispatched work orders' });
  }
});

// GET /vendor/:vendor_id — work orders for a specific vendor
router.get('/vendor/:vendor_id', requireAuth, async (req, res) => {
  try {
    const vendorId = parseInt(req.params.vendor_id, 10);
    if (req.user.role === 'Vendor' && req.user.vendor_id !== vendorId) {
      return fail(res, 'Access denied for this vendor', 403);
    }

    const data = await prisma.workOrder.findMany({
      where: { vendor_id: vendorId },
      include: baseInclude,
      orderBy: { created_at: 'desc' },
    });
    return ok(res, data);
  } catch (err) {
    console.error('[WO VENDOR ERROR]', err.message);
    console.error('[WO VENDOR STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to load vendor work orders' });
  }
});

// GET / — all work orders
router.get('/', requireAuth, async (req, res) => {
  try {
    const where = req.user.role === 'Vendor' ? { vendor_id: req.user.vendor_id } : {};
    
    // Allow filtering by status
    if (req.query.status) {
      where.status = req.query.status;
    }

    const data = await prisma.workOrder.findMany({
      where,
      include: baseInclude,
      orderBy: { created_at: 'desc' },
    });
    return ok(res, data);
  } catch (err) {
    console.error('[WO GET ALL ERROR]', err.message);
    console.error('[WO GET ALL STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to load work orders' });
  }
});

// GET /:id — single work order
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const woId = parseInt(req.params.id, 10);
    if (isNaN(woId) || woId <= 0) {
      return fail(res, 'Invalid work order ID format', 400);
    }
    const wo = await prisma.workOrder.findUnique({
      where: { wo_id: woId },
      include: baseInclude,
    });
    if (!wo) return fail(res, 'Work order not found', 404);
    return ok(res, wo);
  } catch (err) {
    console.error('[WO GET ONE ERROR]', err.message);
    console.error('[WO GET ONE STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to load work order' });
  }
});

module.exports = router;

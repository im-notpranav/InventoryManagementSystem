const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { generatePRNumber } = require('../../utils/generateNumbers');
const { sendPRApprovedEmail, sendRFQEmail } = require('../../utils/mailer');

const router = express.Router();

// GET all purchase requests
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, department } = req.query;
    const where = {};

    // Dept users see only their own
    if (req.user.role === 'Department User') {
      where.requested_by = req.user.user_id;
    }

    if (status) where.status = status;
    if (department) where.user = { department: String(department) };

    const data = await prisma.purchaseRequest.findMany({
      where,
      include: {
        user: { select: { user_id: true, name: true, email: true, department: true } },
        product: true,
        warehouse: true,
        approval_logs: { include: { approver: { select: { name: true } } } },
        items: { include: { product: true } },
      },
      orderBy: { requested_at: 'desc' }
    });
    return ok(res, data);
  } catch (err) {
    console.error('[PR GET ALL ERROR]', err.message);
    console.error('[PR GET ALL STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to load purchase requests' });
  }
});

// GET single
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const pr = await prisma.purchaseRequest.findUnique({
      where: { request_id: parseInt(req.params.id) },
      include: {
        user: { select: { user_id: true, name: true, email: true, department: true } },
        product: true,
        warehouse: true,
        approval_logs: { include: { approver: { select: { name: true } } } },
        vendor_rfqs: { include: { vendor: true } },
        quote_submissions: { include: { vendor: true } },
        work_orders: true,
        items: { include: { product: true } },
      }
    });
    if (!pr) return fail(res, 'Purchase request not found', 404);
    return ok(res, pr);
  } catch (err) {
    console.error('[PR GET ONE ERROR]', err.message);
    console.error('[PR GET ONE STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to load purchase request' });
  }
});

// POST — create new PR (supports single product OR items array)
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      product_id,
      new_product,
      warehouse_id,
      quantity,
      justification,
      priority,
      required_date,
      estimated_cost,
      budget_code,
      items, // NEW: array of { product_id, quantity, estimated_cost?, notes? }
    } = req.body;

    // VALIDATE: warehouse (optional — auto-assign if not provided)
    let resolvedWarehouseId = warehouse_id ? parseInt(warehouse_id) : null;
    if (resolvedWarehouseId) {
      const warehouseExists = await prisma.warehouse.findUnique({
        where: { warehouse_id: resolvedWarehouseId }
      });
      if (!warehouseExists) resolvedWarehouseId = null;
    }
    if (!resolvedWarehouseId) {
      const firstWarehouse = await prisma.warehouse.findFirst();
      if (firstWarehouse) resolvedWarehouseId = firstWarehouse.warehouse_id;
      // warehouse is now optional — don't error if none found
    }

    if (estimated_cost != null && estimated_cost !== '' && parseFloat(estimated_cost) < 0) {
      return fail(res, 'Estimated cost cannot be negative', 400);
    }

    // ── MULTI-PRODUCT (items array) ──
    if (Array.isArray(items) && items.length > 0) {
      // Validate each item
      for (const item of items) {
        if (!item.product_id) return fail(res, 'Each item must have a product_id', 400);
        if (!item.quantity || parseInt(item.quantity) < 1) {
          return fail(res, 'Each item must have quantity >= 1', 400);
        }
      }

      const pr_number = await generatePRNumber(req.user.department);

      const pr = await prisma.$transaction(async (tx) => {
        const created = await tx.purchaseRequest.create({
          data: {
            pr_number,
            requested_by: req.user.user_id,
            product_id: parseInt(items[0].product_id), // primary product
            warehouse_id: resolvedWarehouseId,
            quantity: items.reduce((sum, i) => sum + parseInt(i.quantity), 0),
            priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
            justification: justification?.trim() || null,
            required_date: required_date ? new Date(required_date) : null,
            estimated_cost: estimated_cost != null && estimated_cost !== '' ? parseFloat(estimated_cost) : null,
            budget_code: budget_code != null ? String(budget_code) : null,
            status: 'pending',
          },
        });

        // Create item rows
        for (const item of items) {
          await tx.purchaseRequestItem.create({
            data: {
              request_id: created.request_id,
              product_id: parseInt(item.product_id),
              quantity: parseInt(item.quantity),
              estimated_cost: item.estimated_cost ? parseFloat(item.estimated_cost) : null,
              notes: item.notes || null,
            },
          });
        }

        return created;
      });

      const full = await prisma.purchaseRequest.findUnique({
        where: { request_id: pr.request_id },
        include: {
          product: { include: { category: true } },
          warehouse: true,
          items: { include: { product: true } },
          user: { select: { user_id: true, name: true, email: true } },
        },
      });

      console.log(`[PR] Created multi-item ${full.pr_number} (${items.length} items) by ${req.user.name}`);

      return res.status(201).json({
        success: true,
        message: `Purchase Request ${full.pr_number} created with ${items.length} item(s)`,
        data: full,
      });
    }

    // ── SINGLE PRODUCT (backward compatible) ──
    if (!quantity || parseInt(quantity) < 1) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
    }

    let finalProductId = product_id ? parseInt(product_id) : null;

    if (!finalProductId && new_product) {
      const { name, sku, unit, unit_price, description } = new_product;
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: 'Product name is required when creating a new product' });
      }

      let category = await prisma.category.findFirst({ where: { name: 'General' } });
      if (!category) {
        category = await prisma.category.create({ data: { name: 'General', description: 'Auto-created for on-the-fly products' } });
      }

      const productSku = sku?.trim() || `PROD-${Date.now().toString().slice(-6)}`;
      const skuExists = await prisma.product.findUnique({ where: { sku: productSku } }).catch(() => null);
      const finalSku = skuExists ? `PROD-${Date.now().toString().slice(-6)}` : productSku;

      const createdProduct = await prisma.product.create({
        data: {
          category_id: category.category_id,
          sku: finalSku,
          name: name.trim(),
          description: description?.trim() || null,
          unit: unit?.trim() || 'piece',
          unit_price: parseFloat(unit_price) || 0,
          is_active: true,
        },
      });
      finalProductId = createdProduct.product_id;
    }

    if (!finalProductId) {
      return res.status(400).json({ success: false, message: 'Please select an existing product or provide new product details' });
    }

    const productExists = await prisma.product.findUnique({ where: { product_id: finalProductId } });
    if (!productExists) {
      return res.status(400).json({ success: false, message: 'Selected product not found' });
    }

    const pr_number = await generatePRNumber(req.user.department);

    const pr = await prisma.purchaseRequest.create({
      data: {
        pr_number,
        requested_by: req.user.user_id,
        product_id: finalProductId,
        warehouse_id: resolvedWarehouseId,
        quantity: parseInt(quantity),
        priority: ['low', 'medium', 'high', 'urgent'].includes(priority) ? priority : 'medium',
        justification: justification?.trim() || null,
        required_date: required_date ? new Date(required_date) : null,
        estimated_cost: estimated_cost != null && estimated_cost !== '' ? parseFloat(estimated_cost) : null,
        budget_code: budget_code != null ? String(budget_code) : null,
        status: 'pending',
      },
      include: {
        product: { include: { category: true } },
        warehouse: true,
        user: { select: { user_id: true, name: true, email: true } },
      },
    });

    try {
      console.log(`[PR] Created ${pr.pr_number} by ${req.user.name}`);
    } catch (notifyErr) {
      console.warn('[PR] Notification failed (non-fatal):', notifyErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Purchase Request ${pr.pr_number} created successfully`,
      data: pr,
    });
  } catch (err) {
    console.error('[PR CREATE ERROR]', err.message);
    console.error('[PR CREATE STACK]', err.stack);

    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'A purchase request with this reference already exists. Please try again.' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ success: false, message: 'Invalid product or warehouse selected. Please check your selections.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Related record not found. Please refresh and try again.' });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create purchase request. Please try again.',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// PUT — approve
router.put('/:id/approve', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId) || requestId <= 0) {
      return fail(res, 'Invalid request ID format', 400);
    }
    
    const pr = await prisma.purchaseRequest.findUnique({
      where: { request_id: requestId },
      include: { user: true, product: true }
    });
    if (!pr) return fail(res, 'Purchase request not found', 404);
    if (pr.status !== 'pending') return fail(res, `Cannot approve a request with status: ${pr.status}`);

    await prisma.$transaction([
      prisma.purchaseRequest.update({
        where: { request_id: requestId },
        data: { status: 'approved' }
      }),
      prisma.approvalLog.create({
        data: {
          request_id: requestId,
          approver_id: req.user.user_id,
          action: 'approved',
          comments: req.body.comments || null,
        }
      })
    ]);

    // Send email notification to the requester (fire-and-forget)
    try {
      if (pr.user?.email) {
        await sendPRApprovedEmail({
          to: pr.user.email,
          userName: pr.user.name,
          prNumber: pr.pr_number,
          productName: pr.product?.name || 'Unknown Product',
          quantity: pr.quantity,
        });
      }
    } catch (mailErr) {
      console.error('[PR] Approval email failed:', mailErr.message);
    }

    return ok(res, null, 'Purchase request approved');
  } catch (err) {
    console.error('[PR APPROVE ERROR]', err.message);
    console.error('[PR APPROVE STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to approve purchase request' });
  }
});

// POST — send RFQ (alias for POST /rfq/send — same contract as body: { vendor_ids })
router.post('/:id/send-rfq', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const request_id = parseInt(req.params.id);
    const { vendor_ids } = req.body;
    if (!vendor_ids || !vendor_ids.length) {
      return fail(res, 'At least one vendor is required');
    }

    const pr = await prisma.purchaseRequest.findUnique({
      where: { request_id },
      include: { product: true },
    });
    if (!pr) return fail(res, 'Purchase request not found', 404);
    if (pr.status !== 'approved') return fail(res, 'PR must be approved before sending RFQ');

    const rfqs = [];
    for (const vid of vendor_ids) {
      const vendorId = parseInt(vid);
      const rfq = await prisma.vendorRFQ.create({
        data: {
          request_id,
          vendor_id: vendorId,
          sent_by: req.user.user_id,
          status: 'pending',
        }
      });
      rfqs.push(rfq);

      try {
        const vendor = await prisma.vendor.findUnique({ where: { vendor_id: vendorId } });
        if (vendor?.email) {
          await sendRFQEmail({
            to: vendor.email,
            vendorName: vendor.vendor_name,
            productName: pr.product?.name || 'Unknown Product',
            quantity: pr.quantity,
            prNumber: pr.pr_number || `PR-${pr.request_id}`,
            requiredDate: pr.required_date,
          });
        }
      } catch (mailErr) {
        console.error('[PR] RFQ email failed:', mailErr.message);
      }
    }

    await prisma.purchaseRequest.update({
      where: { request_id },
      data: { status: 'rfq_sent' }
    });

    return ok(res, rfqs, `RFQ sent to ${rfqs.length} vendor(s)`);
  } catch (err) {
    console.error('[PR SEND-RFQ ERROR]', err.message);
    console.error('[PR SEND-RFQ STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to send RFQ' });
  }
});

// PUT — reject
router.put('/:id/reject', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId) || requestId <= 0) {
      return fail(res, 'Invalid request ID format', 400);
    }
    const { reason, comments } = req.body;
    const rejectReason = reason || comments;

    const pr = await prisma.purchaseRequest.findUnique({ where: { request_id: requestId } });
    if (!pr) return fail(res, 'Purchase request not found', 404);
    if (pr.status !== 'pending') return fail(res, `Cannot reject a request with status: ${pr.status}`);

    await prisma.$transaction([
      prisma.purchaseRequest.update({
        where: { request_id: requestId },
        data: { status: 'rejected' }
      }),
      prisma.approvalLog.create({
        data: {
          request_id: requestId,
          approver_id: req.user.user_id,
          action: 'rejected',
          comments: rejectReason || 'No reason provided',
        }
      })
    ]);
    return ok(res, null, 'Purchase request rejected');
  } catch (err) {
    console.error('[PR REJECT ERROR]', err.message);
    console.error('[PR REJECT STACK]', err.stack);
    return res.status(500).json({ success: false, message: 'Failed to reject purchase request' });
  }
});

// PUT — admin remarks on a PR
router.put('/:id/remarks', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId) || requestId <= 0) {
      return fail(res, 'Invalid request ID format', 400);
    }
    const { admin_remarks } = req.body;
    if (admin_remarks == null) return fail(res, 'admin_remarks is required', 400);

    const pr = await prisma.purchaseRequest.update({
      where: { request_id: requestId },
      data: { admin_remarks: String(admin_remarks) },
      include: { product: true, items: { include: { product: true } } },
    });

    return ok(res, pr, 'Remarks updated');
  } catch (err) {
    if (err.code === 'P2025') return fail(res, 'Purchase request not found', 404);
    console.error('[PR REMARKS ERROR]', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update remarks' });
  }
});

module.exports = router;

import { Router } from 'express';
import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';

const router = Router();

/**
 * VENDOR PORTAL ROUTES
 * =====================
 * Complete vendor portal with:
 * - Dashboard stats
 * - Purchase Orders management
 * - Quotation submission
 * - Delivery status updates
 * - History view
 * 
 * Security: All routes validate vendor ownership
 */

// All routes require authentication
router.use(authMiddleware);

// ─── MIDDLEWARE: Require Vendor Role ────────────────────────────
const requireVendor = async (req, res, next) => {
  try {
    if (req.user.role !== 'Vendor') {
      return sendError(res, 'Access denied. Vendor role required.', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { vendor: true },
    });

    if (!user || !user.vendorId || !user.vendor) {
      return sendError(res, 'Your account is not linked to a vendor. Contact admin.', 403);
    }

    if (user.vendor.isBlacklisted) {
      return sendError(res, 'This vendor account has been blacklisted.', 403);
    }

    if (user.vendor.status !== 'Active') {
      return sendError(res, 'This vendor account is not active.', 403);
    }

    // Attach vendor info
    req.vendorId = user.vendor.id;
    req.vendorName = user.vendor.name;
    req.vendor = user.vendor;
    next();
  } catch (err) {
    return sendError(res, 'Error verifying vendor access: ' + err.message, 500);
  }
};

// ══════════════════════════════════════════════════════════════════
// DASHBOARD & PROFILE
// ══════════════════════════════════════════════════════════════════

// GET /profile - Get vendor profile and dashboard stats
router.get('/profile', requireVendor, async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.vendorId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        gstNumber: true,
        rating: true,
        status: true,
        performanceScore: true,
      },
    });

    // Calculate dashboard stats
    const [
      totalOrders,
      pendingOrders,
      confirmedOrders,
      completedOrders,
      totalValueResult,
      totalQuotations,
      acceptedQuotations,
    ] = await Promise.all([
      prisma.purchaseOrder.count({ where: { vendorId: req.vendorId } }),
      prisma.purchaseOrder.count({ 
        where: { vendorId: req.vendorId, status: { in: ['Sent', 'Draft'] } } 
      }),
      prisma.purchaseOrder.count({ 
        where: { vendorId: req.vendorId, status: 'Acknowledged' } 
      }),
      prisma.purchaseOrder.count({ 
        where: { vendorId: req.vendorId, status: 'Completed' } 
      }),
      prisma.purchaseOrder.aggregate({
        where: { vendorId: req.vendorId },
        _sum: { totalAmount: true },
      }),
      prisma.quotation.count({ where: { vendorId: req.vendorId } }),
      prisma.quotation.count({ where: { vendorId: req.vendorId, status: 'Selected' } }),
    ]);

    return sendSuccess(res, {
      vendor,
      stats: {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        completedOrders,
        totalValue: totalValueResult._sum.totalAmount || 0,
        totalQuotations,
        acceptedQuotations,
      },
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ══════════════════════════════════════════════════════════════════

// GET /orders - Get all POs for this vendor
router.get('/orders', requireVendor, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;

    const where = { vendorId: req.vendorId };
    if (status) where.status = status;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: { 
              select: { id: true, name: true, sku: true, unit: true, price: true } 
            },
          },
        },
        request: {
          select: {
            id: true,
            requestNo: true,
            priority: true,
            requiredDate: true,
            notes: true,
            user: { select: { name: true, department: true } },
          },
        },
        portalActions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    return sendSuccess(res, orders);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// GET /orders/:orderId - Get single PO details
router.get('/orders/:orderId', requireVendor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);

    const order = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, vendorId: req.vendorId },
      include: {
        items: {
          include: {
            product: { 
              select: { id: true, name: true, sku: true, unit: true, price: true, description: true } 
            },
          },
        },
        request: {
          include: {
            user: { select: { name: true, email: true, department: true } },
            items: {
              include: { product: true },
            },
          },
        },
        portalActions: {
          orderBy: { createdAt: 'desc' },
        },
        goodsReceipts: {
          include: { items: true },
          orderBy: { receivedAt: 'desc' },
        },
      },
    });

    if (!order) {
      return sendError(res, 'Order not found or access denied.', 404);
    }

    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// POST /orders/:orderId/confirm - Vendor confirms a PO
router.post('/orders/:orderId/confirm', requireVendor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { message, expectedDeliveryDate } = req.body;

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, vendorId: req.vendorId },
    });

    if (!po) {
      return sendError(res, 'Order not found or access denied.', 404);
    }

    if (!['Sent', 'Draft', 'Changes_Requested'].includes(po.status)) {
      return sendError(res, `Cannot confirm order with status "${po.status}".`, 400);
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: 'Acknowledged',
        expectedDelivery: expectedDeliveryDate ? new Date(expectedDeliveryDate) : po.expectedDelivery,
      },
    });

    await prisma.vendorPortalAction.create({
      data: {
        orderId,
        vendorId: req.vendorId,
        action: 'confirmed',
        message: message || 'Order confirmed',
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: 'PO Confirmed',
          message: `${req.vendorName} confirmed PO-${po.orderNo}`,
          type: 'success',
          link: '/purchase-orders',
        })),
      });
    }

    return sendSuccess(res, updatedPO, 'Order confirmed successfully.');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// POST /orders/:orderId/reject - Vendor rejects a PO
router.post('/orders/:orderId/reject', requireVendor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { reason } = req.body;

    if (!reason || reason.trim().length < 5) {
      return sendError(res, 'Please provide a reason for rejection (min 5 characters).', 400);
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, vendorId: req.vendorId },
    });

    if (!po) {
      return sendError(res, 'Order not found or access denied.', 404);
    }

    if (!['Sent', 'Draft', 'Changes_Requested'].includes(po.status)) {
      return sendError(res, `Cannot reject order with status "${po.status}".`, 400);
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'Rejected_By_Vendor' },
    });

    await prisma.vendorPortalAction.create({
      data: {
        orderId,
        vendorId: req.vendorId,
        action: 'rejected',
        message: reason,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: 'PO Rejected by Vendor',
          message: `${req.vendorName} rejected PO-${po.orderNo}: ${reason}`,
          type: 'error',
          link: '/purchase-orders',
        })),
      });
    }

    return sendSuccess(res, updatedPO, 'Order rejected.');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// POST /orders/:orderId/request-changes - Vendor requests changes
router.post('/orders/:orderId/request-changes', requireVendor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { message, suggestedPrice, suggestedDeliveryDate } = req.body;

    if (!message || message.trim().length < 10) {
      return sendError(res, 'Please describe the requested changes (min 10 characters).', 400);
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, vendorId: req.vendorId },
    });

    if (!po) {
      return sendError(res, 'Order not found or access denied.', 404);
    }

    if (!['Sent', 'Draft'].includes(po.status)) {
      return sendError(res, `Cannot request changes for order with status "${po.status}".`, 400);
    }

    let fullMessage = message;
    if (suggestedPrice) fullMessage += ` [Suggested Price: ₹${suggestedPrice}]`;
    if (suggestedDeliveryDate) fullMessage += ` [Suggested Delivery: ${suggestedDeliveryDate}]`;

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'Changes_Requested' },
    });

    await prisma.vendorPortalAction.create({
      data: {
        orderId,
        vendorId: req.vendorId,
        action: 'change_requested',
        message: fullMessage,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: 'Vendor Requested Changes',
          message: `${req.vendorName} requested changes to PO-${po.orderNo}`,
          type: 'warning',
          link: '/purchase-orders',
        })),
      });
    }

    return sendSuccess(res, updatedPO, 'Change request submitted.');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// DELIVERY STATUS UPDATES
// ══════════════════════════════════════════════════════════════════

// POST /orders/:orderId/update-delivery - Update delivery status
router.post('/orders/:orderId/update-delivery', requireVendor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { status, trackingNumber, estimatedDelivery, notes } = req.body;

    const validStatuses = ['processing', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'];
    if (!status || !validStatuses.includes(status)) {
      return sendError(res, `Invalid status. Valid values: ${validStatuses.join(', ')}`, 400);
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, vendorId: req.vendorId },
    });

    if (!po) {
      return sendError(res, 'Order not found or access denied.', 404);
    }

    if (!['Acknowledged', 'Sent'].includes(po.status) && status !== 'delivered') {
      return sendError(res, `Cannot update delivery for order with status "${po.status}".`, 400);
    }

    // Map delivery status to PO status
    let poStatus = po.status;
    if (status === 'delivered') {
      poStatus = 'Completed';
    } else if (status === 'shipped' || status === 'in_transit' || status === 'out_for_delivery') {
      poStatus = 'In_Transit';
    }

    const updateData = { status: poStatus };
    if (estimatedDelivery) {
      updateData.expectedDelivery = new Date(estimatedDelivery);
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: updateData,
    });

    // Log the delivery update
    let actionMessage = `Delivery status: ${status}`;
    if (trackingNumber) actionMessage += ` | Tracking: ${trackingNumber}`;
    if (notes) actionMessage += ` | ${notes}`;

    await prisma.vendorPortalAction.create({
      data: {
        orderId,
        vendorId: req.vendorId,
        action: `delivery_${status}`,
        message: actionMessage,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: status === 'delivered' ? 'Order Delivered' : 'Delivery Update',
          message: `${req.vendorName}: PO-${po.orderNo} - ${status}`,
          type: status === 'delivered' ? 'success' : 'info',
          link: '/purchase-orders',
        })),
      });
    }

    return sendSuccess(res, updatedPO, `Delivery status updated to "${status}".`);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// QUOTATIONS (RFQ RESPONSES)
// ══════════════════════════════════════════════════════════════════

// GET /rfqs - Get open RFQs that vendor can quote on
router.get('/rfqs', requireVendor, async (req, res) => {
  try {
    // Get RFQs that are open and vendor hasn't already quoted on
    const existingQuotations = await prisma.quotation.findMany({
      where: { vendorId: req.vendorId },
      select: { rfqId: true },
    });
    const quotedRfqIds = existingQuotations.map(q => q.rfqId);

    const rfqs = await prisma.rFQ.findMany({
      where: {
        status: 'Open',
        id: { notIn: quotedRfqIds },
      },
      include: {
        request: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, unit: true, price: true },
                },
              },
            },
            user: { select: { name: true, department: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, rfqs);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// GET /rfqs/:rfqId - Get single RFQ details
router.get('/rfqs/:rfqId', requireVendor, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.rfqId);

    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: {
        request: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, unit: true, price: true, description: true },
                },
              },
            },
            user: { select: { name: true, department: true, email: true } },
          },
        },
      },
    });

    if (!rfq) {
      return sendError(res, 'RFQ not found.', 404);
    }

    // Check if vendor already submitted a quotation
    const existingQuote = await prisma.quotation.findFirst({
      where: { rfqId, vendorId: req.vendorId },
      include: { items: true },
    });

    return sendSuccess(res, { rfq, existingQuote });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// POST /rfqs/:rfqId/quote - Submit quotation for an RFQ
router.post('/rfqs/:rfqId/quote', requireVendor, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.rfqId);
    const { items, deliveryDays, validUntil, terms, notes } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Please provide quotation items with prices.', 400);
    }

    // Verify RFQ exists and is open
    const rfq = await prisma.rFQ.findUnique({
      where: { id: rfqId },
      include: { request: { include: { items: true } } },
    });

    if (!rfq) {
      return sendError(res, 'RFQ not found.', 404);
    }

    if (rfq.status !== 'Open') {
      return sendError(res, 'This RFQ is no longer accepting quotations.', 400);
    }

    // Check if vendor already quoted
    const existingQuote = await prisma.quotation.findFirst({
      where: { rfqId, vendorId: req.vendorId },
    });

    if (existingQuote) {
      return sendError(res, 'You have already submitted a quotation for this RFQ.', 400);
    }

    // Calculate total
    let totalAmount = 0;
    const quotationItems = items.map(item => {
      const itemTotal = item.quantity * item.unitPrice;
      totalAmount += itemTotal;
      return {
        productId: item.productId || null,
        customProductName: item.customProductName || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
      };
    });

    // Create quotation
    const quotation = await prisma.quotation.create({
      data: {
        rfqId,
        vendorId: req.vendorId,
        totalAmount,
        deliveryDays: deliveryDays || null,
        validUntil: validUntil ? new Date(validUntil) : null,
        terms: terms || null,
        notes: notes || null,
        items: {
          create: quotationItems,
        },
      },
      include: { items: true },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: 'New Quotation Received',
          message: `${req.vendorName} submitted a quotation for RFQ-${rfq.rfqNo}`,
          type: 'info',
          link: '/rfq',
        })),
      });
    }

    return sendSuccess(res, quotation, 'Quotation submitted successfully.');
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// GET /quotations - Get all quotations submitted by this vendor
router.get('/quotations', requireVendor, async (req, res) => {
  try {
    const { status } = req.query;

    const where = { vendorId: req.vendorId };
    if (status) where.status = status;

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        rfq: {
          select: {
            id: true,
            rfqNo: true,
            status: true,
            deadline: true,
          },
        },
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });

    return sendSuccess(res, quotations);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════════════════════════

// GET /history/orders - Get order history
router.get('/history/orders', requireVendor, async (req, res) => {
  try {
    const { year, month, limit = 100 } = req.query;

    const where = { vendorId: req.vendorId };

    // Filter by date if provided
    if (year) {
      const startDate = new Date(parseInt(year), month ? parseInt(month) - 1 : 0, 1);
      const endDate = month 
        ? new Date(parseInt(year), parseInt(month), 0, 23, 59, 59)
        : new Date(parseInt(year), 11, 31, 23, 59, 59);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
        portalActions: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    // Calculate summary stats
    const summary = {
      totalOrders: orders.length,
      totalValue: orders.reduce((sum, o) => sum + o.totalAmount, 0),
      byStatus: {},
    };

    orders.forEach(order => {
      summary.byStatus[order.status] = (summary.byStatus[order.status] || 0) + 1;
    });

    return sendSuccess(res, { orders, summary });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// GET /history/quotations - Get quotation history
router.get('/history/quotations', requireVendor, async (req, res) => {
  try {
    const { year, status, limit = 100 } = req.query;

    const where = { vendorId: req.vendorId };
    if (status) where.status = status;

    if (year) {
      const startDate = new Date(parseInt(year), 0, 1);
      const endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
      where.submittedAt = { gte: startDate, lte: endDate };
    }

    const quotations = await prisma.quotation.findMany({
      where,
      include: {
        rfq: {
          include: {
            request: {
              select: { requestNo: true, notes: true },
            },
          },
        },
        items: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
      take: parseInt(limit),
    });

    // Summary
    const summary = {
      totalQuotations: quotations.length,
      totalValue: quotations.reduce((sum, q) => sum + q.totalAmount, 0),
      accepted: quotations.filter(q => q.status === 'Selected').length,
      rejected: quotations.filter(q => q.status === 'Rejected').length,
      pending: quotations.filter(q => q.status === 'Submitted').length,
    };

    return sendSuccess(res, { quotations, summary });
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

// GET /activity - Get recent activity log
router.get('/activity', requireVendor, async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const actions = await prisma.vendorPortalAction.findMany({
      where: { vendorId: req.vendorId },
      include: {
        order: {
          select: { id: true, orderNo: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    return sendSuccess(res, actions);
  } catch (err) {
    return sendError(res, err.message, 500);
  }
});

export default router;

import { Router } from 'express';
import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';

const router = Router();

/**
 * Vendor Portal Routes
 * Vendors log in with their regular user account (role=Vendor, linked to a Vendor record)
 * They can view POs assigned to their vendor company and take actions (confirm/reject/request changes)
 */

// All routes require authentication
router.use(authMiddleware);


// Middleware: Ensure user has Vendor role and is linked to a Vendor record
const requireVendor = async (req, res, next) => {
  try {
    // Must have Vendor role
    if (req.user.role !== 'Vendor') {
      return sendError(res, 'Access denied. Vendor role required.', 403);
    }

    // Get user with vendor relation
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { vendor: true },
    });

    if (!user) {
      return sendError(res, 'User not found.', 404);
    }

    if (!user.vendorId || !user.vendor) {
      return sendError(res, 'Your account is not linked to a vendor. Contact admin.', 403);
    }

    if (user.vendor.isBlacklisted) {
      return sendError(res, 'This vendor account has been blacklisted.', 403);
    }

    if (user.vendor.status !== 'Active') {
      return sendError(res, 'This vendor account is not active.', 403);
    }

    // Attach vendor info to request
    req.vendorId = user.vendor.id;
    req.vendorName = user.vendor.name;
    req.vendor = user.vendor;
    next();
  } catch (err) {
    return sendError(res, 'Error verifying vendor access.', 500);
  }
};

// ─── GET /profile ──────────────────────────────────────────────
// Get vendor's profile info with comprehensive stats
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
        rating: true,
        status: true,
        performanceScore: true,
      },
    });

    // Count all stats including RFQs and quotations
    const [
      totalOrders, 
      pendingOrders, 
      completedOrders,
      totalValue,
      totalRfqs,
      pendingQuotations,
      submittedQuotations,
      selectedQuotations,
    ] = await Promise.all([
      prisma.purchaseOrder.count({ where: { vendorId: req.vendorId } }),
      prisma.purchaseOrder.count({ where: { vendorId: req.vendorId, status: { in: ['Sent', 'Acknowledged'] } } }),
      prisma.purchaseOrder.count({ where: { vendorId: req.vendorId, status: 'Completed' } }),
      prisma.purchaseOrder.aggregate({
        where: { vendorId: req.vendorId },
        _sum: { totalAmount: true },
      }),
      prisma.rFQVendor.count({ where: { vendorId: req.vendorId } }),
      prisma.rFQVendor.count({ 
        where: { 
          vendorId: req.vendorId, 
          status: 'Invited',
          rfq: { status: 'Open' }
        } 
      }),
      prisma.quotation.count({ where: { vendorId: req.vendorId } }),
      prisma.quotation.count({ where: { vendorId: req.vendorId, status: 'Selected' } }),
    ]);

    return sendSuccess(res, {
      vendor,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalValue: totalValue._sum.totalAmount || 0,
        totalRfqs,
        pendingQuotations,
        submittedQuotations,
        selectedQuotations,
      },
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    return sendError(res, 'Failed to load vendor profile.', 500);
  }
});

// ─── GET /orders ───────────────────────────────────────────────
// Get all POs for this vendor
router.get('/orders', requireVendor, async (req, res) => {
  try {
    const { status } = req.query;

    const where = { vendorId: req.vendorId };
    if (status) where.status = status;
    
    console.log('Fetching orders for vendor:', req.vendorId, 'with filter:', where);

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true } },
          },
        },
        request: {
          select: {
            requestNo: true,
            priority: true,
            requiredDate: true,
            notes: true,
          },
        },
        portalActions: {
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    console.log('Found orders:', orders.length);

    return sendSuccess(res, orders);
  } catch (err) {
    console.error('Error fetching vendor orders:', err);
    return sendError(res, 'Failed to load orders.', 500);
  }
});

// ─── GET /orders/:orderId ──────────────────────────────────────
// Get single PO details
router.get('/orders/:orderId', requireVendor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);

    const order = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, vendorId: req.vendorId },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit: true, price: true } },
          },
        },
        request: {
          include: {
            user: { select: { name: true, email: true, department: true } },
          },
        },
        portalActions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      return sendError(res, 'Order not found.', 404);
    }

    return sendSuccess(res, order);
  } catch (err) {
    return sendError(res, 'Failed to load order details.', 500);
  }
});

// ─── POST /orders/:orderId/confirm ─────────────────────────────
// Vendor confirms a PO
router.post('/orders/:orderId/confirm', requireVendor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const { message, expectedDeliveryDate } = req.body;

    // Verify PO belongs to this vendor and is in confirmable state
    const po = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, vendorId: req.vendorId },
    });

    if (!po) {
      return sendError(res, 'Order not found.', 404);
    }

    if (!['Sent', 'Draft', 'Changes_Requested'].includes(po.status)) {
      return sendError(res, `Cannot confirm order with status "${po.status}".`, 400);
    }

    // Update PO
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: {
        status: 'Acknowledged',
        expectedDelivery: expectedDeliveryDate ? new Date(expectedDeliveryDate) : po.expectedDelivery,
      },
    });

    // Log the action
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

    await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'PO Confirmed',
        message: `${req.vendorName} confirmed ${po.po_number || po.orderNo}`,
        type: 'success',
        link: `/purchase-orders`,
      })),
    });

    return sendSuccess(res, updatedPO, 'Order confirmed successfully.');
  } catch (err) {
    return sendError(res, 'Failed to confirm order.', 500);
  }
});

// ─── POST /orders/:orderId/reject ──────────────────────────────
// Vendor rejects a PO
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
      return sendError(res, 'Order not found.', 404);
    }

    if (!['Sent', 'Draft', 'Changes_Requested'].includes(po.status)) {
      return sendError(res, `Cannot reject order with status "${po.status}".`, 400);
    }

    // Update PO
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'Rejected_By_Vendor' },
    });

    // Log the action
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

    await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'PO Rejected by Vendor',
        message: `${req.vendorName} rejected ${po.po_number || po.orderNo}: ${reason}`,
        type: 'error',
        link: `/purchase-orders`,
      })),
    });

    return sendSuccess(res, updatedPO, 'Order rejected.');
  } catch (err) {
    return sendError(res, 'Failed to reject order.', 500);
  }
});

// ─── POST /orders/:orderId/request-changes ─────────────────────
// Vendor requests changes to a PO
router.post('/orders/:orderId/request-changes', requireVendor, async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const {
      message,
      requestedChanges,
      reason,
      requestedDelivery,
      requestedTerms,
      requestedItems,
      suggestedPrice,
      suggestedDeliveryDate,
    } = req.body || {};

    const normalizedRequestedChanges = String(requestedChanges || message || '').trim();
    const normalizedReason = String(reason || message || '').trim();

    if (!normalizedRequestedChanges || normalizedRequestedChanges.length < 10) {
      return sendError(res, 'Please describe the requested changes (min 10 characters).', 400);
    }
    if (!normalizedReason || normalizedReason.length < 5) {
      return sendError(res, 'Please provide a reason for the requested changes (min 5 characters).', 400);
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: orderId, vendorId: req.vendorId },
    });

    if (!po) {
      return sendError(res, 'Order not found.', 404);
    }

    if (!['Sent', 'Draft'].includes(po.status)) {
      return sendError(res, `Cannot request changes for order with status "${po.status}".`, 400);
    }

    const existingPending = await prisma.pOChangeRequest.findFirst({
      where: {
        purchaseOrderId: orderId,
        vendorId: req.vendorId,
        status: 'pending',
      },
    });
    if (existingPending) {
      return sendError(res, 'A pending change request already exists for this order.', 400);
    }

    const payloadRequestedItems = Array.isArray(requestedItems) ? requestedItems : [];
    const normalizedItems = payloadRequestedItems
      .map((item) => ({
        productId: Number(item?.productId),
        quantityOrdered: Number(item?.quantityOrdered),
        priceEach: item?.priceEach !== undefined ? Number(item?.priceEach) : undefined,
      }))
      .filter((item) => Number.isInteger(item.productId) && Number.isFinite(item.quantityOrdered) && item.quantityOrdered > 0);

    let requestedNotes = normalizedRequestedChanges;
    if (suggestedPrice) requestedNotes += ` [Suggested Price: ₹${suggestedPrice}]`;
    if (suggestedDeliveryDate) requestedNotes += ` [Suggested Delivery: ${suggestedDeliveryDate}]`;

    const createdRequest = await prisma.pOChangeRequest.create({
      data: {
        purchaseOrderId: orderId,
        vendorId: req.vendorId,
        requestedChanges: requestedNotes,
        reason: normalizedReason,
        requestedDelivery: requestedDelivery || suggestedDeliveryDate ? new Date(requestedDelivery || suggestedDeliveryDate) : null,
        requestedTerms: requestedTerms ? String(requestedTerms).trim() : null,
        requestedItems: normalizedItems.length > 0 ? normalizedItems : null,
      },
    });

    // Update PO
    const updatedPO = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data: { status: 'Changes_Requested' },
    });

    // Log the action
    await prisma.vendorPortalAction.create({
      data: {
        orderId,
        vendorId: req.vendorId,
        action: 'change_requested',
        message: requestedNotes,
      },
    });

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
      select: { id: true },
    });

    await prisma.notification.createMany({
      data: admins.map(admin => ({
        userId: admin.id,
        title: 'Vendor Requested Changes',
        message: `${req.vendorName} requested changes to ${po.po_number || po.orderNo}`,
        type: 'warning',
        link: `/purchase-orders`,
      })),
    });

    return sendSuccess(
      res,
      {
        purchaseOrder: updatedPO,
        changeRequest: createdRequest,
      },
      'Change request submitted.'
    );
  } catch (err) {
    return sendError(res, 'Failed to submit change request.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// DELIVERY STATUS UPDATES
// ═══════════════════════════════════════════════════════════════

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

    // Map delivery status to PO status
    let poStatus = po.status;
    if (status === 'delivered') {
      poStatus = 'Completed';
    } else if (['shipped', 'in_transit', 'out_for_delivery'].includes(status)) {
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
          message: `${req.vendorName}: ${po.po_number || po.orderNo} - ${status}`,
          type: status === 'delivered' ? 'success' : 'info',
          link: '/purchase-orders',
        })),
      });
    }

    return sendSuccess(res, updatedPO, `Delivery status updated to "${status}".`);
  } catch (err) {
    return sendError(res, 'Failed to update delivery status.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// QUOTATIONS (RFQ RESPONSES)
// ═══════════════════════════════════════════════════════════════

// GET /rfqs - Get RFQs that THIS vendor is invited to
// Vendors only see RFQs they are specifically invited to (not all RFQs)
router.get('/rfqs', requireVendor, async (req, res) => {
  try {
    console.log('Fetching RFQs for vendor:', req.vendorId);
    
    // Get RFQs where this vendor is invited
    const rfqInvitations = await prisma.rFQVendor.findMany({
      where: { vendorId: req.vendorId },
      include: {
        rfq: {
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
            quotations: {
              where: { vendorId: req.vendorId },
              select: { id: true, status: true, totalAmount: true },
            },
          },
        },
      },
      orderBy: { invitedAt: 'desc' },
    });

    console.log('Found RFQ invitations:', rfqInvitations.length);
    console.log('Invitation details:', rfqInvitations.map(inv => ({
      rfqId: inv.rfqId,
      rfqStatus: inv.rfq?.status,
      invStatus: inv.status
    })));

    // Transform to include invitation status and whether vendor has quoted
    const rfqs = rfqInvitations
      .filter(inv => inv.rfq.status === 'Open') // Only show open RFQs
      .map(inv => ({
        ...inv.rfq,
        invitationStatus: inv.status,
        invitedAt: inv.invitedAt,
        viewedAt: inv.viewedAt,
        hasQuoted: inv.rfq.quotations.length > 0,
        myQuotation: inv.rfq.quotations[0] || null,
      }));

    console.log('Open RFQs for vendor:', rfqs.length);
    return sendSuccess(res, rfqs);
  } catch (err) {
    console.error('Error fetching vendor RFQs:', err);
    return sendError(res, 'Failed to fetch vendor RFQs.', 500);
  }
});

// Mark RFQ as viewed by vendor
router.post('/rfqs/:rfqId/view', requireVendor, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.rfqId);
    
    const invitation = await prisma.rFQVendor.findUnique({
      where: { rfqId_vendorId: { rfqId, vendorId: req.vendorId } },
    });

    if (!invitation) {
      return sendError(res, 'You are not invited to this RFQ.', 403);
    }

    if (!invitation.viewedAt) {
      await prisma.rFQVendor.update({
        where: { id: invitation.id },
        data: { viewedAt: new Date(), status: 'Viewed' },
      });
    }

    return sendSuccess(res, { message: 'RFQ marked as viewed' });
  } catch (err) {
    return sendError(res, 'Failed to mark RFQ as viewed.', 500);
  }
});

// GET /approved-requests - Removed: vendors should only see RFQs they're invited to
// This endpoint was showing ALL approved requests which doesn't fit the invite model
router.get('/approved-requests', requireVendor, async (req, res) => {
  // In the new model, vendors only see RFQs they're invited to
  // Return empty or redirect to /rfqs
  return sendSuccess(res, [], 'Use /rfqs endpoint to see RFQs you are invited to.');
});

// GET /rfqs/:rfqId - Get single RFQ details
router.get('/rfqs/:rfqId', requireVendor, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.rfqId);
    const invitation = await prisma.rFQVendor.findUnique({
      where: { rfqId_vendorId: { rfqId, vendorId: req.vendorId } },
    });
    if (!invitation) {
      return sendError(res, 'You are not invited to this RFQ.', 403);
    }

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
    return sendError(res, 'Failed to fetch RFQ details.', 500);
  }
});

// POST /rfqs/:rfqId/quote - Submit quotation for an RFQ
router.post('/rfqs/:rfqId/quote', requireVendor, async (req, res) => {
  try {
    const rfqId = parseInt(req.params.rfqId);
    const { items, deliveryDays, validUntil, terms, notes } = req.body;

    console.log('Quote submission received:', {
      rfqId,
      vendorId: req.vendorId,
      itemsCount: items?.length,
    });

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'Please provide quotation items with prices.', 400);
    }

    // Verify vendor is invited to this RFQ
    const invitation = await prisma.rFQVendor.findUnique({
      where: { rfqId_vendorId: { rfqId, vendorId: req.vendorId } },
    });

    if (!invitation) {
      return sendError(res, 'You are not invited to submit a quotation for this RFQ.', 403);
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

    // Calculate total and validate items
    let totalAmount = 0;
    const quotationItems = items.map(item => {
      const qty = typeof item.quantity === 'number' ? item.quantity : parseInt(item.quantity) || 0;
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(item.unitPrice) || 0;
      const itemTotal = qty * price;
      totalAmount += itemTotal;
      
      // Handle productId - could be number, string, null, or undefined
      let prodId = null;
      if (item.productId !== null && item.productId !== undefined) {
        prodId = typeof item.productId === 'number' ? item.productId : parseInt(item.productId);
        if (isNaN(prodId)) prodId = null;
      }
      
      return {
        productId: prodId,
        customProductName: item.customProductName || null,
        quantity: qty,
        unitPrice: price,
        totalPrice: itemTotal,
      };
    });

    // Validate that we have valid items
    if (quotationItems.every(item => item.quantity === 0 || item.unitPrice === 0)) {
      return sendError(res, 'Please provide valid quantities and prices for items.', 400);
    }

    // Parse deliveryDays as integer
    const parsedDeliveryDays = deliveryDays ? parseInt(deliveryDays) : null;

    // Create quotation
    const quotation = await prisma.quotation.create({
      data: {
        rfqId,
        vendorId: req.vendorId,
        totalAmount,
        deliveryDays: parsedDeliveryDays,
        validUntil: validUntil ? new Date(validUntil) : null,
        terms: terms || null,
        notes: notes || null,
        items: {
          create: quotationItems,
        },
      },
      include: { items: true },
    });

    // Update RFQVendor status to Quoted
    await prisma.rFQVendor.update({
      where: { rfqId_vendorId: { rfqId, vendorId: req.vendorId } },
      data: { status: 'Quoted', respondedAt: new Date() },
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
          message: `${req.vendorName} submitted a quotation for RFQ-${rfq.rfqNo || rfq.id}`,
          type: 'info',
          link: '/rfq',
        })),
      }).catch(err => console.error('Failed to create notifications:', err));
    }

    return sendSuccess(res, quotation, 'Quotation submitted successfully.');
  } catch (err) {
    console.error('Quote submission error:', err);
    console.error('Error stack:', err.stack);
    return sendError(res, 'Failed to submit quotation.', 500);
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
    return sendError(res, 'Failed to fetch quotations.', 500);
  }
});

// ═══════════════════════════════════════════════════════════════
// HISTORY & ACTIVITY
// ═══════════════════════════════════════════════════════════════

// GET /history/orders - Get order history
router.get('/history/orders', requireVendor, async (req, res) => {
  try {
    const { year, month, limit = 100 } = req.query;

    const where = { vendorId: req.vendorId };

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
    return sendError(res, 'Failed to load order history.', 500);
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

    const summary = {
      totalQuotations: quotations.length,
      totalValue: quotations.reduce((sum, q) => sum + q.totalAmount, 0),
      accepted: quotations.filter(q => q.status === 'Selected').length,
      rejected: quotations.filter(q => q.status === 'Rejected').length,
      pending: quotations.filter(q => q.status === 'Submitted').length,
    };

    return sendSuccess(res, { quotations, summary });
  } catch (err) {
    return sendError(res, 'Failed to load quotation history.', 500);
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
          select: { id: true, orderNo: true, po_number: true, totalAmount: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });

    return sendSuccess(res, actions);
  } catch (err) {
    return sendError(res, 'Failed to load activity history.', 500);
  }
});

export default router;

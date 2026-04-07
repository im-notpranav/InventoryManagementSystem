import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { sendPOToVendor } from '../../../utils/sendPOToVendor.js';

export const getAll = async (req, res, next) => {
  try {
    const where = req.user.role === 'Admin' || req.user.role === 'Manager' ? {} : { userId: req.user.id };
    if (req.query.status) where.status = req.query.status;

    const requests = await prisma.purchaseRequest.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, requests);
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const pr = await prisma.purchaseRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, department: true } },
        items: { include: { product: true } },
        purchaseOrders: { include: { vendor: true } },
      },
    });
    if (!pr) return sendError(res, 'Purchase request not found.', 404);
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager' && pr.userId !== req.user.id) {
      return sendError(res, 'Access denied.', 403);
    }
    return sendSuccess(res, pr);
  } catch (error) { next(error); }
};

export const create = async (req, res, next) => {
  try {
    const { items, priority, notes, requiredDate, estimatedCost, budgetCode } = req.body;
    if (!items || items.length === 0) return sendError(res, 'At least one item is required.', 400);

    // Validate items - each must have either productId OR customProductName
    for (const item of items) {
      if (!item.productId && !item.customProductName) {
        return sendError(res, 'Each item must have either a product selected or a custom product name.', 400);
      }
      if (!item.quantity || item.quantity < 1) {
        return sendError(res, 'Each item must have a quantity of at least 1.', 400);
      }
    }

    const pr = await prisma.purchaseRequest.create({
      data: {
        userId: req.user.id,
        priority: priority || 'Medium',
        notes,
        requiredDate: requiredDate ? new Date(requiredDate) : null,
        estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
        budgetCode: budgetCode || null,
        items: {
          create: items.map(item => ({
            productId: item.productId || null,
            quantity: item.quantity,
            notes: item.notes,
            customProductName: item.customProductName || null,
            customProductDesc: item.customProductDesc || null,
            customEstimatedPrice: item.customEstimatedPrice ? parseFloat(item.customEstimatedPrice) : null,
          })),
        },
      },
      include: { items: { include: { product: true } }, user: { select: { id: true, name: true } } },
    });

    // Notify admins
    const admins = await prisma.user.findMany({ where: { role: { name: 'Admin' }, isActive: true } });
    
    // Check if request has custom products
    const hasCustomProducts = items.some(i => !i.productId && i.customProductName);
    const notifTitle = hasCustomProducts ? 'New Request (Custom Product)' : 'New Purchase Request';
    const notifMessage = hasCustomProducts 
      ? `${req.user.name} submitted a purchase request with NEW product(s) (${pr.requestNo}).`
      : `${req.user.name} submitted a new purchase request (${pr.requestNo}).`;

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: notifTitle,
          message: notifMessage,
          type: hasCustomProducts ? 'warning' : 'info',
          link: '/purchase-requests',
        },
      });
    }

    return sendSuccess(res, pr, 'Purchase request created.', 201);
  } catch (error) { next(error); }
};

/**
 * Approve a purchase request
 * If vendorId is provided, also auto-generates a Purchase Order
 * If no vendorId, just approves the request (PO can be created later via RFQ process)
 */
export const approve = async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id);
    const { vendorId, paymentTerms, shippingTerms, expectedDelivery } = req.body;

    // If vendorId is provided, create PO automatically
    if (vendorId) {
      // Check vendor is valid and not blacklisted
      const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (!vendor) return sendError(res, 'Selected vendor not found.', 404);
      if (vendor.isBlacklisted) return sendError(res, 'Cannot create PO with a blacklisted vendor.', 400);

      // Execute in a transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        // 1. Update request status to Approved
        const updatedRequest = await tx.purchaseRequest.update({
          where: { id: requestId },
          data: {
            status: 'Approved',
            approvedAt: new Date(),
          },
          include: {
            items: { include: { product: true } },
            user: true,
          },
        });

        // 2. Calculate total amount from items
        let totalAmount = 0;
        const orderItemsData = updatedRequest.items.map(item => {
          const price = item.product?.price || item.customEstimatedPrice || 0;
          const lineTotal = item.quantity * price;
          totalAmount += lineTotal;
          return {
            productId: item.productId,
            quantityOrdered: item.quantity,
            priceEach: price,
          };
        });

        // Use estimatedCost from request if available, otherwise calculated
        const finalTotal = updatedRequest.estimatedCost
          ? Number(updatedRequest.estimatedCost)
          : totalAmount;

        // 3. Create Purchase Order
        const po = await tx.purchaseOrder.create({
          data: {
            requestId: requestId,
            vendorId: vendorId,
            status: 'Draft',
            totalAmount: finalTotal,
            paymentTerms: paymentTerms || 'Net 30',
            shippingTerms: shippingTerms || null,
            expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
            sentToVendor: false,
            items: {
              create: orderItemsData.filter(item => item.productId), // Only create items with valid productId
            },
          },
          include: {
            items: true,
            vendor: true,
          },
        });

        // 4. Update request status to PO_Created
        await tx.purchaseRequest.update({
          where: { id: requestId },
          data: { status: 'PO_Created' },
        });

        // 5. Create audit log
        await tx.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'APPROVE',
            entity: 'PurchaseRequest',
            entityId: requestId,
            details: `Approved and created PO-${po.orderNo} for vendor ${vendor.name}`,
          },
        });

        return { updatedRequest, po, vendor };
      });

      // 6. Send PO to vendor (outside transaction - email failure shouldn't rollback)
      await sendPOToVendor(result.po);

      // 7. Notify the requester
      await prisma.notification.create({
        data: {
          userId: result.updatedRequest.userId,
          title: 'Request Approved & PO Created',
          message: `Your purchase request (${result.updatedRequest.requestNo}) has been approved. PO-${result.po.orderNo} has been sent to ${result.vendor.name}.`,
          type: 'success',
          link: `/purchase-orders/${result.po.id}`,
        },
      });

      return sendSuccess(res, {
        request: result.updatedRequest,
        purchaseOrder: result.po,
      }, 'Request approved and PO created successfully.');
    } else {
      // Simple approval without PO (vendor can be selected later via RFQ)
      const pr = await prisma.purchaseRequest.update({
        where: { id: requestId },
        data: { status: 'Approved', approvedAt: new Date() },
        include: { user: true },
      });

      await prisma.notification.create({
        data: {
          userId: pr.userId,
          title: 'Request Approved',
          message: `Your purchase request (${pr.requestNo}) has been approved.`,
          type: 'success',
          link: '/purchase-requests',
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'APPROVE',
          entity: 'PurchaseRequest',
          entityId: requestId,
          details: `Approved request ${pr.requestNo}`,
        },
      });

      return sendSuccess(res, pr, 'Request approved.');
    }
  } catch (error) { next(error); }
};

export const reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const pr = await prisma.purchaseRequest.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'Rejected', rejectedAt: new Date(), notes: reason },
    });

    await prisma.notification.create({
      data: {
        userId: pr.userId,
        title: 'Request Rejected',
        message: `Your purchase request (${pr.requestNo}) was rejected. ${reason || ''}`,
        type: 'error',
        link: '/purchase-requests',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: 'REJECT',
        entity: 'PurchaseRequest',
        entityId: pr.id,
        details: `Rejected with reason: ${reason || 'No reason provided'}`,
      },
    });

    return sendSuccess(res, pr, 'Request rejected.');
  } catch (error) { next(error); }
};

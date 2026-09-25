import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { generatePRNumber } from '../../../utils/generateNumbers.js';

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

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { department: true },
    });
    const pr_number = await generatePRNumber(currentUser?.department || 'GEN');

    const pr = await prisma.purchaseRequest.create({
      data: {
        pr_number,
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
      ? `${req.user.name} submitted a purchase request with NEW product(s) (${pr.pr_number || pr.requestNo}).`
      : `${req.user.name} submitted a new purchase request (${pr.pr_number || pr.requestNo}).`;

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

export const approve = async (req, res, next) => {
  try {
    const requestId = parseInt(req.params.id);
    // NEW FLOW: After approval, Admin sends RFQ to vendors.
    // Vendors upload Quotation + Proforma Invoice.
    // Admin approves quotation → Work Order created.
    // No automatic PO is generated anymore.
    // See: /api/quotations and /api/work-orders routes.
    const pr = await prisma.purchaseRequest.update({
      where: { id: requestId },
      data: { status: 'rfq_sent', approvedAt: new Date() },
      include: { user: true },
    });

    await prisma.notification.create({
      data: {
        userId: pr.userId,
        title: 'Request Approved',
        message: `Your purchase request (${pr.pr_number || pr.requestNo}) has been approved and moved to RFQ stage.`,
        type: 'success',
        link: '/purchase-requests',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'APPROVE',
        entity: 'PurchaseRequest',
        entityId: requestId,
        details: `Approved request ${pr.pr_number || pr.requestNo} and moved to rfq_sent`,
      },
    });

    return sendSuccess(res, pr, 'Request approved and moved to RFQ stage.');
  } catch (error) { next(error); }
};

export const reject = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const pr = await prisma.purchaseRequest.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'rejected', rejectedAt: new Date(), notes: reason },
    });

    await prisma.notification.create({
      data: {
        userId: pr.userId,
        title: 'Request Rejected',
        message: `Your purchase request (${pr.pr_number || pr.requestNo}) was rejected. ${reason || ''}`,
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

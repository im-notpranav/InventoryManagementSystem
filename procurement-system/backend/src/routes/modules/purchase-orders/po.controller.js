import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { sendPurchaseOrderEmail } from '../../../utils/mailer.js';
import { generatePONumber } from '../../../utils/generateNumbers.js';

export const getAll = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: true,
        request: { select: { requestNo: true, pr_number: true } },
        items: { include: { product: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, orders);
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        vendor: true,
        request: { include: { user: { select: { name: true, department: true } } } },
        items: { include: { product: true } },
        goodsReceipts: true,
        invoices: true,
        changeRequests: {
          include: {
            vendor: { select: { id: true, name: true, email: true } },
            reviewedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!po) return sendError(res, 'Purchase order not found.', 404);
    return sendSuccess(res, po);
  } catch (error) { next(error); }
};

export const create = async (req, res, next) => {
  try {
    const { requestId, vendorId, items, expectedDelivery } = req.body;

    const request = await prisma.purchaseRequest.findUnique({ where: { id: requestId } });
    if (!request || (request.status !== 'approved' && request.status !== 'Approved')) {
      return sendError(res, 'Request must be approved first.', 400);
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.priceEach * item.quantityOrdered), 0);

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    const po_number = await generatePONumber(vendor?.name);

    const po = await prisma.purchaseOrder.create({
      data: {
        po_number,
        requestId,
        vendorId,
        totalAmount,
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            priceEach: item.priceEach,
          })),
        },
      },
      include: { vendor: true, items: { include: { product: true } } },
    });

    // Send email to vendor
    await sendPurchaseOrderEmail(po.vendor, po.po_number || po.orderNo);

    return sendSuccess(res, po, 'Purchase order created.', 201);
  } catch (error) { next(error); }
};

export const update = async (req, res, next) => {
  try {
    const { status, expectedDelivery } = req.body;
    const data = {};
    if (status) data.status = status;
    if (expectedDelivery) data.expectedDelivery = new Date(expectedDelivery);

    const po = await prisma.purchaseOrder.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { vendor: true },
    });
    return sendSuccess(res, po, 'Purchase order updated.');
  } catch (error) { next(error); }
};

export const getChangeRequests = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = String(status);

      const requests = await prisma.pOChangeRequest.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        purchaseOrder: {
          select: {
            id: true,
            orderNo: true,
            po_number: true,
            items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          },
        },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return sendSuccess(res, requests);
  } catch (error) {
    next(error);
  }
};

export const reviewChangeRequest = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { action, adminResponse, admin_response, appliedChanges, applied_changes } = req.body || {};

    if (!id || !['approved', 'rejected'].includes(action)) {
      return sendError(res, 'Action must be "approved" or "rejected".', 400);
    }

    const changeRequest = await prisma.pOChangeRequest.findUnique({
      where: { id },
      include: {
        purchaseOrder: { include: { items: true } },
        vendor: true,
      },
    });
    if (!changeRequest) {
      return sendError(res, 'PO change request not found.', 404);
    }
    if (changeRequest.status !== 'pending') {
      return sendError(res, 'This request has already been reviewed.', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      let updatedOrder = null;
      if (action === 'approved') {
        const poUpdate = {};
        const changes = appliedChanges || applied_changes || {};

        const expectedDelivery = changes.expectedDelivery || changeRequest.requestedDelivery;
        if (expectedDelivery) {
          poUpdate.expectedDelivery = new Date(expectedDelivery);
        }
        const paymentTerms = changes.paymentTerms || changeRequest.requestedTerms;
        if (paymentTerms) {
          poUpdate.paymentTerms = String(paymentTerms);
        }
        if (changes.shippingTerms) {
          poUpdate.shippingTerms = String(changes.shippingTerms);
        }

        const requestedItems = Array.isArray(changes.items)
          ? changes.items
          : (Array.isArray(changeRequest.requestedItems) ? changeRequest.requestedItems : []);

        if (requestedItems.length > 0) {
          for (const item of requestedItems) {
            const productId = Number(item?.productId);
            const quantityOrdered = Number(item?.quantityOrdered);
            const priceEach = item?.priceEach !== undefined ? Number(item.priceEach) : undefined;
            if (!Number.isInteger(productId) || !Number.isFinite(quantityOrdered) || quantityOrdered <= 0) continue;

            const itemUpdate = { quantityOrdered };
            if (priceEach !== undefined && Number.isFinite(priceEach) && priceEach >= 0) {
              itemUpdate.priceEach = priceEach;
            }
            await tx.orderItem.updateMany({
              where: {
                orderId: changeRequest.purchaseOrderId,
                productId,
              },
              data: itemUpdate,
            });
          }

          const refreshedItems = await tx.orderItem.findMany({
            where: { orderId: changeRequest.purchaseOrderId },
          });
          poUpdate.totalAmount = refreshedItems.reduce(
            (sum, item) => sum + Number(item.quantityOrdered) * Number(item.priceEach),
            0
          );
        }

        if (Object.keys(poUpdate).length > 0) {
          updatedOrder = await tx.purchaseOrder.update({
            where: { id: changeRequest.purchaseOrderId },
            data: poUpdate,
          });
        }
      }

      const reviewed = await tx.pOChangeRequest.update({
        where: { id },
        data: {
          status: action,
          adminResponse: (adminResponse || admin_response) ? String(adminResponse || admin_response).trim() : null,
          reviewedById: req.user.id,
          reviewedAt: new Date(),
        },
      });

      return { reviewed, updatedOrder };
    });

    const vendorUser = await prisma.user.findFirst({
      where: { vendorId: changeRequest.vendorId, role: { name: 'Vendor' }, isActive: true },
      select: { id: true },
    });
    if (vendorUser) {
      await prisma.notification.create({
        data: {
          userId: vendorUser.id,
          title: action === 'approved' ? 'PO Change Request Approved' : 'PO Change Request Rejected',
          message: action === 'approved'
            ? `Your request for ${changeRequest.purchaseOrder.po_number || changeRequest.purchaseOrder.orderNo} was approved.`
            : `Your request for ${changeRequest.purchaseOrder.po_number || changeRequest.purchaseOrder.orderNo} was rejected.`,
          type: action === 'approved' ? 'success' : 'error',
          link: '/vendor/orders',
        },
      });
    }

    return sendSuccess(
      res,
      result,
      action === 'approved' ? 'Change request approved.' : 'Change request rejected.'
    );
  } catch (error) {
    next(error);
  }
};

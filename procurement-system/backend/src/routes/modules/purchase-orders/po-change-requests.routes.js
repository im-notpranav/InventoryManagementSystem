import { Router } from 'express';
import prisma from '../../../config/db.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';
import { sendError, sendSuccess } from '../../../utils/response.js';

const router = Router();
router.use(authMiddleware);

const getVendorContext = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendor: true },
  });
  if (!user || user.role !== 'Vendor' || !user.vendorId || !user.vendor) {
    return null;
  }
  return user.vendor;
};

// Vendor: create PO change request
router.post('/', rbac('Vendor'), async (req, res) => {
  try {
    const {
      purchase_order_id,
      requested_changes,
      reason,
      requested_delivery,
      requested_terms,
      requested_items,
    } = req.body || {};

    const purchaseOrderId = parseInt(purchase_order_id, 10);
    if (!purchaseOrderId || !requested_changes || !reason) {
      return sendError(res, 'purchase_order_id, requested_changes, and reason are required.', 400);
    }
    if (String(requested_changes).trim().length < 10) {
      return sendError(res, 'requested_changes must be at least 10 characters.', 400);
    }
    if (String(reason).trim().length < 5) {
      return sendError(res, 'reason must be at least 5 characters.', 400);
    }

    const vendor = await getVendorContext(req.user.id);
    if (!vendor) {
      return sendError(res, 'Vendor account is not linked correctly.', 403);
    }

    const po = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, vendorId: vendor.id },
      include: { items: true },
    });
    if (!po) {
      return sendError(res, 'Purchase order not found for this vendor.', 404);
    }

    const existingPending = await prisma.pOChangeRequest.findFirst({
      where: {
        purchaseOrderId,
        vendorId: vendor.id,
        status: 'pending',
      },
    });
    if (existingPending) {
      return sendError(res, 'A pending change request already exists for this purchase order.', 400);
    }

    const normalizedItems = Array.isArray(requested_items)
      ? requested_items
          .map((item) => ({
            productId: Number(item?.productId),
            quantityOrdered: Number(item?.quantityOrdered),
            priceEach: item?.priceEach !== undefined ? Number(item?.priceEach) : undefined,
          }))
          .filter((item) => Number.isInteger(item.productId) && Number.isFinite(item.quantityOrdered) && item.quantityOrdered > 0)
      : [];

    const created = await prisma.pOChangeRequest.create({
      data: {
        purchaseOrderId,
        vendorId: vendor.id,
        requestedChanges: String(requested_changes).trim(),
        reason: String(reason).trim(),
        requestedDelivery: requested_delivery ? new Date(requested_delivery) : null,
        requestedTerms: requested_terms ? String(requested_terms).trim() : null,
        requestedItems: normalizedItems.length > 0 ? normalizedItems : null,
      },
      include: {
        purchaseOrder: { select: { id: true, orderNo: true, po_number: true, status: true, totalAmount: true } },
        vendor: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: 'Changes_Requested' },
    });

    await prisma.vendorPortalAction.create({
      data: {
        orderId: purchaseOrderId,
        vendorId: vendor.id,
        action: 'change_requested',
        message: String(requested_changes).trim(),
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: { name: { in: ['Admin', 'Manager'] } }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'PO Change Request Submitted',
          message: `${vendor.name} requested changes for ${po.po_number || po.orderNo}.`,
          type: 'warning',
          link: '/purchase-orders',
        })),
      });
    }

    return sendSuccess(res, created, 'PO change request submitted.', 201);
  } catch (err) {
    return sendError(res, 'Failed to submit PO change request.', 500);
  }
});

// Vendor: list own change requests
router.get('/mine', rbac('Vendor'), async (req, res) => {
  try {
    const vendor = await getVendorContext(req.user.id);
    if (!vendor) {
      return sendError(res, 'Vendor account is not linked correctly.', 403);
    }

    const requests = await prisma.pOChangeRequest.findMany({
      where: { vendorId: vendor.id },
      include: {
        purchaseOrder: {
          select: { id: true, orderNo: true, po_number: true, status: true, totalAmount: true, expectedDelivery: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, requests);
  } catch (err) {
    return sendError(res, 'Failed to load your PO change requests.', 500);
  }
});

// Admin/Manager: list all change requests
router.get('/', rbac('Admin', 'Manager'), async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = String(status);

    const requests = await prisma.pOChangeRequest.findMany({
      where,
      include: {
        vendor: { select: { id: true, name: true, email: true } },
        purchaseOrder: {
          include: {
            items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          },
        },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return sendSuccess(res, requests);
  } catch (err) {
    return sendError(res, 'Failed to load PO change requests.', 500);
  }
});

// Admin/Manager: approve/reject a request
router.put('/:id/review', rbac('Admin', 'Manager'), async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { action, admin_response, adminResponse, applied_changes, appliedChanges } = req.body || {};

    if (!requestId || !['approved', 'rejected'].includes(action)) {
      return sendError(res, 'Valid request id and action ("approved" or "rejected") are required.', 400);
    }

    const changeRequest = await prisma.pOChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        purchaseOrder: {
          include: {
            items: true,
          },
        },
        vendor: true,
      },
    });

    if (!changeRequest) {
      return sendError(res, 'PO change request not found.', 404);
    }
    if (changeRequest.status !== 'pending') {
      return sendError(res, 'Only pending requests can be reviewed.', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      let updatedOrder = null;

      if (action === 'approved') {
        const poUpdate = {};

        const changes = applied_changes || appliedChanges || {};
        const deliveryFromPayload = changes.expectedDelivery || changes.expected_delivery;
        const termsFromPayload = changes.paymentTerms || changes.payment_terms;
        const shippingTermsFromPayload = changes.shippingTerms || changes.shipping_terms;
        const itemsFromPayload = Array.isArray(changes.items) ? changes.items : null;

        const resolvedDelivery = deliveryFromPayload || changeRequest.requestedDelivery;
        if (resolvedDelivery) {
          poUpdate.expectedDelivery = new Date(resolvedDelivery);
        }

        const resolvedTerms = termsFromPayload || changeRequest.requestedTerms;
        if (resolvedTerms) {
          poUpdate.paymentTerms = String(resolvedTerms);
        }
        if (shippingTermsFromPayload) {
          poUpdate.shippingTerms = String(shippingTermsFromPayload);
        }

        const requestedItems = itemsFromPayload || (Array.isArray(changeRequest.requestedItems) ? changeRequest.requestedItems : null);
        if (requestedItems && requestedItems.length > 0) {
          for (const item of requestedItems) {
            const productId = Number(item?.productId);
            const quantityOrdered = Number(item?.quantityOrdered);
            const priceEach = item?.priceEach !== undefined ? Number(item.priceEach) : undefined;
            if (!Number.isInteger(productId) || !Number.isFinite(quantityOrdered) || quantityOrdered <= 0) {
              continue;
            }
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
            data: { ...poUpdate, status: 'Sent' },
          });
        } else {
          updatedOrder = await tx.purchaseOrder.update({
            where: { id: changeRequest.purchaseOrderId },
            data: { status: 'Sent' },
          });
        }
      } else if (changeRequest.purchaseOrder.status === 'Changes_Requested') {
        updatedOrder = await tx.purchaseOrder.update({
          where: { id: changeRequest.purchaseOrderId },
          data: { status: 'Sent' },
        });
      }

      const reviewedRequest = await tx.pOChangeRequest.update({
        where: { id: requestId },
        data: {
          status: action,
          adminResponse: (admin_response || adminResponse) ? String(admin_response || adminResponse).trim() : null,
          reviewedAt: new Date(),
          reviewedById: req.user.id,
        },
      });

      return { reviewedRequest, updatedOrder };
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
          message:
            action === 'approved'
              ? `Your change request for ${changeRequest.purchaseOrder.po_number || changeRequest.purchaseOrder.orderNo} was approved.`
              : `Your change request for ${changeRequest.purchaseOrder.po_number || changeRequest.purchaseOrder.orderNo} was rejected.`,
          type: action === 'approved' ? 'success' : 'error',
          link: '/vendor/orders',
        },
      });
    }

    return sendSuccess(
      res,
      result,
      action === 'approved' ? 'PO change request approved and applied.' : 'PO change request rejected.'
    );
  } catch (err) {
    return sendError(res, 'Failed to review PO change request.', 500);
  }
});

export default router;

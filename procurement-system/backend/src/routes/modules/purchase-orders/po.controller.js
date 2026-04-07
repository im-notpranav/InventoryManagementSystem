import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { sendPurchaseOrderEmail } from '../../../utils/mailer.js';

export const getAll = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: true,
        request: { select: { requestNo: true } },
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
    if (!request || request.status !== 'Approved') {
      return sendError(res, 'Request must be approved first.', 400);
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.priceEach * item.quantityOrdered), 0);

    const po = await prisma.purchaseOrder.create({
      data: {
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
    await sendPurchaseOrderEmail(po.vendor, po.orderNo);

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

import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';

export const getAll = async (req, res, next) => {
  try {
    const receipts = await prisma.goodsReceipt.findMany({
      include: {
        order: { include: { vendor: true } },
        items: true,
      },
      orderBy: { receivedAt: 'desc' },
    });
    return sendSuccess(res, receipts);
  } catch (error) { next(error); }
};

export const create = async (req, res, next) => {
  try {
    const { orderId, items, notes } = req.body;

    const order = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return sendError(res, 'Purchase order not found.', 404);

    const receipt = await prisma.goodsReceipt.create({
      data: {
        orderId,
        receivedBy: req.user.name,
        notes,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantityReceived: item.quantityReceived,
            condition: item.condition || 'Good',
          })),
        },
      },
      include: { items: true },
    });

    // Update inventory for each received item
    for (const item of items) {
      if (item.condition !== 'Damaged') {
        await prisma.inventory.upsert({
          where: { productId: item.productId },
          update: { quantity: { increment: item.quantityReceived } },
          create: { productId: item.productId, quantity: item.quantityReceived },
        });
      }

      // Update order item received quantity
      const orderItem = order.items.find(oi => oi.productId === item.productId);
      if (orderItem) {
        await prisma.orderItem.update({
          where: { id: orderItem.id },
          data: { quantityReceived: { increment: item.quantityReceived } },
        });
      }
    }

    // Check if all order items are fully received
    const updatedOrder = await prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    const allReceived = updatedOrder.items.every(i => i.quantityReceived >= i.quantityOrdered);
    if (allReceived) {
      await prisma.purchaseOrder.update({
        where: { id: orderId },
        data: { status: 'Completed' },
      });
    }

    return sendSuccess(res, receipt, 'Goods receipt recorded. Inventory updated.', 201);
  } catch (error) { next(error); }
};

import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';

export const getAll = async (req, res, next) => {
  try {
    const invoices = await prisma.invoice.findMany({
      include: { order: { include: { vendor: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, invoices);
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        order: { 
          include: { 
            vendor: true, 
            items: { include: { product: true } },
            goodsReceipts: { include: { items: true } },
          } 
        } 
      },
    });
    if (!invoice) return sendError(res, 'Invoice not found.', 404);
    return sendSuccess(res, invoice);
  } catch (error) { next(error); }
};

// Three-way match: Compare Invoice vs PO vs Goods Receipt
const performThreeWayMatch = async (orderId, invoiceAmount) => {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { 
      items: true,
      goodsReceipts: { include: { items: true } },
    },
  });

  if (!order) return { match: false, reason: 'Purchase order not found' };

  // Calculate PO total
  const poTotal = order.items.reduce((sum, item) => sum + (item.priceEach * item.quantityOrdered), 0);

  // Calculate total received from all goods receipts (excluding damaged)
  const totalReceived = {};
  for (const receipt of order.goodsReceipts) {
    for (const item of receipt.items) {
      if (item.condition !== 'Damaged') {
        totalReceived[item.productId] = (totalReceived[item.productId] || 0) + item.quantityReceived;
      }
    }
  }

  // Calculate GR value based on received quantities
  let grValue = 0;
  for (const orderItem of order.items) {
    const receivedQty = totalReceived[orderItem.productId] || 0;
    grValue += orderItem.priceEach * Math.min(receivedQty, orderItem.quantityOrdered);
  }

  // Matching tolerance (allow 2% variance)
  const tolerance = 0.02;
  
  const poMatch = Math.abs(invoiceAmount - poTotal) <= poTotal * tolerance;
  const grMatch = Math.abs(invoiceAmount - grValue) <= grValue * tolerance;
  
  const issues = [];
  if (!poMatch) issues.push(`Invoice (₹${invoiceAmount}) differs from PO (₹${poTotal})`);
  if (!grMatch) issues.push(`Invoice (₹${invoiceAmount}) differs from received goods value (₹${grValue})`);
  if (Object.keys(totalReceived).length === 0) issues.push('No goods received yet');

  return {
    match: poMatch && grMatch && Object.keys(totalReceived).length > 0,
    poTotal,
    grValue,
    invoiceAmount,
    issues,
  };
};

export const create = async (req, res, next) => {
  try {
    const { invoiceNo, orderId, amount, taxAmount, invoiceDate, dueDate } = req.body;
    const totalAmount = amount + (taxAmount || 0);

    // Perform three-way match
    const matchResult = await performThreeWayMatch(orderId, totalAmount);

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        orderId,
        amount,
        taxAmount: taxAmount || 0,
        totalAmount,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        status: matchResult.match ? 'Matched' : 'Pending',
      },
      include: { order: { include: { vendor: true } } },
    });

    // Create notification for admin about invoice
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
    });

    const notifMessage = matchResult.match 
      ? `Invoice ${invoiceNo} matched successfully with PO and GR.`
      : `Invoice ${invoiceNo} has matching issues: ${matchResult.issues.join(', ')}`;

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: matchResult.match ? '✅ Invoice Matched' : '⚠️ Invoice Mismatch',
          message: notifMessage,
          type: matchResult.match ? 'success' : 'warning',
          link: '/invoices',
        },
      });
    }

    return sendSuccess(res, { invoice, matchResult }, 'Invoice created.', 201);
  } catch (error) { next(error); }
};

export const updateStatus = async (req, res, next) => {
  try {
    const { status, paidAt } = req.body;
    const data = { status };
    if (status === 'Paid' && paidAt) data.paidAt = new Date(paidAt);
    if (status === 'Paid' && !paidAt) data.paidAt = new Date();

    const invoice = await prisma.invoice.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { order: { include: { vendor: true } } },
    });
    return sendSuccess(res, invoice, 'Invoice status updated.');
  } catch (error) { next(error); }
};

export const verifyMatch = async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(req.params.id) },
    });
    if (!invoice) return sendError(res, 'Invoice not found.', 404);

    const matchResult = await performThreeWayMatch(invoice.orderId, invoice.totalAmount);
    
    // Update invoice status based on match
    if (matchResult.match && invoice.status === 'Pending') {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: 'Matched' },
      });
    }

    return sendSuccess(res, matchResult, 'Three-way match verification complete.');
  } catch (error) { next(error); }
};

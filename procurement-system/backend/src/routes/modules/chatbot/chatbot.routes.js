import express from 'express';
import rateLimit from 'express-rate-limit';
import OpenAI from 'openai';
import { z } from 'zod';
import prisma from '../../../config/db.js';
import env from '../../../config/env.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { blockVendor } from '../../../middleware/rbac.middleware.js';
import { generatePRNumber } from '../../../utils/generateNumbers.js';
import { sendSuccess, sendError } from '../../../utils/response.js';

const router = express.Router();

const chatbotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many chatbot requests. Please try again later.' },
});

const messageSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  conversation_history: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(2000),
    })
  ).max(20).optional().default([]),
});

const actionSchema = z.object({
  type: z.literal('CREATE_PURCHASE_REQUEST'),
  data: z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().positive().max(10000),
    warehouse_id: z.number().int().positive().optional().nullable(),
    justification: z.string().trim().max(1000).optional().nullable(),
    priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).optional().default('Medium'),
    required_date: z.string().optional().nullable(),
  }),
});

const toSafeDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSystemContext = async (user) => {
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: { select: { name: true } } },
  });
  const roleName = currentUser?.role?.name || user?.role;
  const isPrivileged = roleName === 'Admin' || roleName === 'Manager';
  const [inventory, products, warranties, subscriptions] = await Promise.all([
    prisma.inventory.findMany({ include: { product: true } }),
    prisma.product.findMany({ include: { category: true } }),
    prisma.warranty.findMany({ include: { product: true } }),
    prisma.subscription.findMany({}),
  ]);

  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const lowStock = inventory.filter((item) => Number(item.quantity || 0) <= Number(item.reorderPoint || 0));
  const expiringWarranties = warranties.filter((item) => item.endDate && new Date(item.endDate) <= soon);
  const expiringSubscriptions = subscriptions.filter((item) => item.endDate && new Date(item.endDate) <= soon);

  const baseContext = {
    inventory_summary: inventory.map((item) => ({
      product: item.product?.name || 'Unknown',
      sku: item.product?.sku || '',
      location: item.location || 'N/A',
      quantity_available: Number(item.quantity || 0),
      reorder_point: Number(item.reorderPoint || 0),
      is_low_stock: Number(item.quantity || 0) <= Number(item.reorderPoint || 0),
    })),
    low_stock_items: lowStock.map((item) => ({
      product: item.product?.name || 'Unknown',
      quantity: Number(item.quantity || 0),
      reorder_point: Number(item.reorderPoint || 0),
    })),
    products: products.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category?.name || null,
      unit_price: Number(item.price || 0),
    })),
    warranties: warranties.map((item) => ({
      product: item.product?.name || 'Unknown',
      provider: item.provider || null,
      end_date: item.endDate,
      days_remaining: Math.ceil((new Date(item.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
    })),
    expiring_warranties: expiringWarranties.map((item) => ({
      product: item.product?.name || 'Unknown',
      end_date: item.endDate,
    })),
    expiring_subscriptions: expiringSubscriptions.map((item) => ({
      service: item.name,
      expiry_date: item.endDate,
    })),
  };

  if (!isPrivileged) {
    const ownRequests = await prisma.purchaseRequest.findMany({
      where: { userId: user.id },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      ...baseContext,
      purchase_requests: ownRequests.map((request) => ({
        id: request.id,
        pr_number: request.pr_number || request.requestNo,
        products: request.items.map((item) => item.product?.name || item.customProductName).join(', '),
        status: request.status,
        priority: request.priority,
        date: request.createdAt,
      })),
      purchase_orders: [],
      vendors: [],
    };
  }

  const [purchaseRequests, purchaseOrders, vendors] = await Promise.all([
    prisma.purchaseRequest.findMany({
      include: { user: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.purchaseOrder.findMany({
      include: { vendor: true, items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.vendor.findMany(),
  ]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const staleOrders = purchaseOrders.filter((order) => {
    if (['Completed', 'Cancelled'].includes(order.status)) return false;
    const lastUpdate = order.updatedAt || order.sentAt || order.createdAt;
    return lastUpdate ? new Date(lastUpdate) <= sevenDaysAgo : false;
  });

  return {
    ...baseContext,
    purchase_requests: purchaseRequests.map((request) => ({
      id: request.id,
      pr_number: request.pr_number || request.requestNo,
      products: request.items.map((item) => item.product?.name || item.customProductName).join(', '),
      status: request.status,
      priority: request.priority,
      requested_by: request.user?.name || 'Unknown',
      date: request.createdAt,
    })),
    purchase_orders: purchaseOrders.map((order) => ({
      id: order.id,
      po_number: order.po_number || order.orderNo,
      vendor: order.vendor?.name || 'Unknown',
      status: order.status,
      total: Number(order.totalAmount || 0),
      date: order.createdAt,
      items: order.items.map((item) => ({
        product: item.product?.name || 'Unknown',
        ordered: Number(item.quantityOrdered || 0),
        received: Number(item.quantityReceived || 0),
      })),
    })),
    stale_purchase_orders: staleOrders.map((order) => ({
      po_number: order.po_number || order.orderNo,
      status: order.status,
      last_updated: order.updatedAt || order.sentAt || order.createdAt,
    })),
    vendors: vendors.map((vendor) => ({
      id: vendor.id,
      name: vendor.name,
      email: vendor.email,
      rating: Number(vendor.rating || 0),
    })),
  };
};

router.post('/message', authMiddleware, blockVendor, chatbotLimiter, async (req, res, next) => {
  try {
    if (!env.OPENAI_API_KEY) {
      return sendError(res, 'OPENAI_API_KEY is missing. Chatbot cannot respond.', 500);
    }

    const { message, conversation_history } = messageSchema.parse(req.body);
    const userId = req.user.id;

    const [context, currentUser] = await Promise.all([
      getSystemContext(req.user),
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, department: true, role: { select: { name: true } } },
      }),
    ]);

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const systemPrompt = `
You are ProcureIQ Assistant, an intelligent procurement and inventory management AI.
You have LIVE read access to current system data:

${JSON.stringify(context, null, 2)}

YOUR CAPABILITIES:
1. Answer inventory/stock/products/warranty/subscription/PR/PO/vendor/delivery questions using only this context.
2. CREATE purchase requests for the user only when asked. Use this strict action block:
<ACTION>
{
  "type": "CREATE_PURCHASE_REQUEST",
  "data": {
    "product_id": <number>,
    "quantity": <number>,
    "warehouse_id": <number or null>,
    "justification": "<string or null>",
    "priority": "Medium",
    "required_date": "<ISO date or null>"
  }
}
</ACTION>
Then explain in plain language.
3. NEVER approve requests. If asked, state only authorized approvers can approve.
4. Always alert for low stock, expiring warranties/subscriptions (<=30 days), and stale POs (no updates for >=7 days).
5. Guide users step by step on workflows.

RULES:
- Professional and concise.
- Use INR (₹) for money.
- Use bullet points for lists.
- If missing in context, explicitly say you don't have that information.
- Never fabricate.
- Today's date is ${new Date().toDateString()}.
    `;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.slice(-10).map((entry) => ({ role: entry.role, content: entry.content })),
      { role: 'user', content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 1000,
      temperature: 0.3,
    });

    const rawReply = completion.choices?.[0]?.message?.content || '';
    const actionMatch = rawReply.match(/<ACTION>([\s\S]*?)<\/ACTION>/);
    let actionResult = null;

    if (actionMatch) {
      try {
        const parsedAction = actionSchema.safeParse(JSON.parse(actionMatch[1].trim()));
        if (parsedAction.success) {
          const action = parsedAction.data;
          const product = await prisma.product.findUnique({
            where: { id: action.data.product_id },
            select: { id: true, name: true },
          });

          if (!product) {
            throw new Error('Action payload contains invalid product_id.');
          }

          const pr_number = await generatePRNumber(currentUser?.department || 'GEN');
          const requiredDate = toSafeDate(action.data.required_date);

          const pr = await prisma.purchaseRequest.create({
            data: {
              pr_number,
              userId,
              status: 'Pending',
              priority: action.data.priority || 'Medium',
              notes: action.data.justification || '',
              requiredDate,
              items: {
                create: [{
                  productId: action.data.product_id,
                  quantity: action.data.quantity,
                  notes: action.data.justification || null,
                }],
              },
            },
          });

          actionResult = {
            type: 'PURCHASE_REQUEST_CREATED',
            pr_number: pr.pr_number || pr.requestNo,
            request_id: pr.id,
          };
        }
      } catch (error) {
        console.error('Action execution error:', error.message);
      }
    }

    const cleanReply = rawReply.replace(/<ACTION>[\s\S]*?<\/ACTION>/g, '').trim();

    return sendSuccess(res, {
      reply: cleanReply,
      action_result: actionResult,
      updated_context: {
        low_stock_count: context.low_stock_items.length,
        expiring_warranties: context.expiring_warranties.length,
        expiring_subscriptions: context.expiring_subscriptions.length,
        stale_purchase_orders: context.stale_purchase_orders?.length || 0,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, 'Invalid chatbot payload.', 400, error.flatten());
    }
    return next(error);
  }
});

export default router;

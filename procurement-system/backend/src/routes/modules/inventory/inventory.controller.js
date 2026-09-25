import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';

export const getAll = async (req, res, next) => {
  try {
    const inventory = await prisma.inventory.findMany({
      include: { product: { include: { category: true } } },
      orderBy: { product: { name: 'asc' } },
    });
    return sendSuccess(res, inventory);
  } catch (error) { next(error); }
};

export const getLowStock = async (req, res, next) => {
  try {
    const items = await prisma.$queryRaw`
      SELECT i.*, p.name as "productName", p.sku, p.unit,
             c.name as "categoryName"
      FROM "Inventory" i
      JOIN "Product" p ON p.id = i."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE i.quantity <= i."reorderPoint"
      ORDER BY i.quantity ASC
    `;
    return sendSuccess(res, items);
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const item = await prisma.inventory.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { product: { include: { category: true } } },
    });
    if (!item) return sendError(res, 'Inventory item not found.', 404);
    return sendSuccess(res, item);
  } catch (error) { next(error); }
};

export const adjust = async (req, res, next) => {
  try {
    const { quantity, reorderPoint, minimumStock, location } = req.body;
    const data = {};
    if (quantity !== undefined) data.quantity = quantity;
    if (reorderPoint !== undefined) data.reorderPoint = reorderPoint;
    if (minimumStock !== undefined) data.minimumStock = minimumStock;
    if (location !== undefined) data.location = location;

    const item = await prisma.inventory.update({
      where: { id: parseInt(req.params.id) },
      data,
      include: { product: true },
    });
    return sendSuccess(res, item, 'Inventory updated.');
  } catch (error) { next(error); }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalProducts = await prisma.product.count();
    const totalInventory = await prisma.inventory.aggregate({ _sum: { quantity: true } });
    const lowStockCount = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM "Inventory" WHERE quantity <= "reorderPoint"
    `;
    const pendingRequests = await prisma.purchaseRequest.count({
      where: { status: { in: ['pending', 'Pending'] } },
    });
    const activeOrders = await prisma.purchaseOrder.count({ where: { status: { in: ['Draft', 'Sent', 'Acknowledged'] } } });
    const activeVendors = await prisma.vendor.count({ where: { status: 'Active' } });

    const recentOrders = await prisma.purchaseOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { vendor: true, items: { include: { product: true } } },
    });

    const recentRequests = await prisma.purchaseRequest.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { user: { omit: { password: true, refreshToken: true } } },
    });

    return sendSuccess(res, {
      totalProducts,
      totalInventoryQty: totalInventory._sum.quantity || 0,
      lowStockCount: lowStockCount[0]?.count || 0,
      pendingRequests,
      activeOrders,
      activeVendors,
      recentOrders,
      recentRequests,
    });
  } catch (error) { next(error); }
};

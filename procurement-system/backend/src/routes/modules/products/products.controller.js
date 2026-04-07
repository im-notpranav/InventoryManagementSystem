import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';

// ─── Categories ─────────────────────────────────────
export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, categories);
  } catch (error) { next(error); }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return sendError(res, 'Category name is required.', 400);
    const category = await prisma.category.create({ data: { name } });
    return sendSuccess(res, category, 'Category created.', 201);
  } catch (error) {
    if (error.code === 'P2002') return sendError(res, 'Category already exists.', 409);
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id) },
      data: { name },
    });
    return sendSuccess(res, category, 'Category updated.');
  } catch (error) { next(error); }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return sendError(res, `Cannot delete category with ${productCount} products.`, 400);
    }
    await prisma.category.delete({ where: { id } });
    return sendSuccess(res, null, 'Category deleted.');
  } catch (error) { next(error); }
};

// ─── Products ───────────────────────────────────────
export const getAll = async (req, res, next) => {
  try {
    const { search, categoryId } = req.query;
    const where = {};
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (categoryId) where.categoryId = parseInt(categoryId);

    const products = await prisma.product.findMany({
      where,
      include: { category: true, inventory: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, products);
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { category: true, inventory: true, warranties: true },
    });
    if (!product) return sendError(res, 'Product not found.', 404);
    return sendSuccess(res, product);
  } catch (error) { next(error); }
};

export const create = async (req, res, next) => {
  try {
    const { name, sku, description, unit, price, categoryId } = req.body;
    const product = await prisma.product.create({
      data: { name, sku, description, unit, price, categoryId },
      include: { category: true },
    });
    // Auto-create inventory entry
    await prisma.inventory.create({
      data: { productId: product.id, quantity: 0 },
    });
    return sendSuccess(res, product, 'Product created.', 201);
  } catch (error) { next(error); }
};

export const update = async (req, res, next) => {
  try {
    const { name, sku, description, unit, price, categoryId } = req.body;
    const product = await prisma.product.update({
      where: { id: parseInt(req.params.id) },
      data: { name, sku, description, unit, price, categoryId },
      include: { category: true },
    });
    return sendSuccess(res, product, 'Product updated.');
  } catch (error) { next(error); }
};

export const remove = async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: parseInt(req.params.id) } });
    return sendSuccess(res, null, 'Product deleted.');
  } catch (error) { next(error); }
};

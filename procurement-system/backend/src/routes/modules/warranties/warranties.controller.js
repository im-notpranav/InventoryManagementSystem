import prisma from '../../../config/db.js';
import { sendSuccess } from '../../../utils/response.js';

// ─── Warranties ────────────────────────────────────
export const getAll = async (req, res, next) => {
  try {
    const warranties = await prisma.warranty.findMany({
      include: { product: true },
      orderBy: { endDate: 'asc' },
    });
    return sendSuccess(res, warranties);
  } catch (error) { next(error); }
};

export const getExpiring = async (req, res, next) => {
  try {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const warranties = await prisma.warranty.findMany({
      where: {
        status: 'Active',
        endDate: { lte: thirtyDays, gte: new Date() },
      },
      include: { product: true },
      orderBy: { endDate: 'asc' },
    });
    return sendSuccess(res, warranties);
  } catch (error) { next(error); }
};

export const create = async (req, res, next) => {
  try {
    const { productId, serialNo, provider, startDate, endDate, terms } = req.body;
    const warranty = await prisma.warranty.create({
      data: {
        productId,
        serialNo,
        provider,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        terms,
      },
      include: { product: true },
    });
    return sendSuccess(res, warranty, 'Warranty created.', 201);
  } catch (error) { next(error); }
};

export const updateWarranty = async (req, res, next) => {
  try {
    const { serialNo, provider, startDate, endDate, terms, status } = req.body;
    const warranty = await prisma.warranty.update({
      where: { id: parseInt(req.params.id) },
      data: {
        serialNo,
        provider,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        terms,
        status,
      },
      include: { product: true },
    });
    return sendSuccess(res, warranty, 'Warranty updated.');
  } catch (error) { next(error); }
};

// ─── Subscriptions ─────────────────────────────────
export const getAllSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      orderBy: { endDate: 'asc' },
    });
    return sendSuccess(res, subscriptions);
  } catch (error) { next(error); }
};

export const getExpiringSubscriptions = async (req, res, next) => {
  try {
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'Active',
        endDate: { lte: thirtyDays, gte: new Date() },
      },
      orderBy: { endDate: 'asc' },
    });
    return sendSuccess(res, subscriptions);
  } catch (error) { next(error); }
};

export const createSubscription = async (req, res, next) => {
  try {
    const { name, vendor, type, startDate, endDate, renewalCost, licenseCount, autoRenew, notes } = req.body;
    const subscription = await prisma.subscription.create({
      data: {
        name,
        vendor,
        type: type || 'Software',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        renewalCost: renewalCost || 0,
        licenseCount: licenseCount || 1,
        autoRenew: autoRenew || false,
        notes,
      },
    });
    return sendSuccess(res, subscription, 'Subscription created.', 201);
  } catch (error) { next(error); }
};

export const updateSubscription = async (req, res, next) => {
  try {
    const { name, vendor, type, startDate, endDate, renewalCost, licenseCount, autoRenew, notes, status } = req.body;
    const subscription = await prisma.subscription.update({
      where: { id: parseInt(req.params.id) },
      data: {
        name,
        vendor,
        type,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        renewalCost,
        licenseCount,
        autoRenew,
        notes,
        status,
      },
    });
    return sendSuccess(res, subscription, 'Subscription updated.');
  } catch (error) { next(error); }
};

export const deleteSubscription = async (req, res, next) => {
  try {
    await prisma.subscription.delete({ where: { id: parseInt(req.params.id) } });
    return sendSuccess(res, null, 'Subscription deleted.');
  } catch (error) { next(error); }
};

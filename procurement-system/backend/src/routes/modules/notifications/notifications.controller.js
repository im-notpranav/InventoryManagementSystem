import prisma from '../../../config/db.js';
import { sendError, sendSuccess } from '../../../utils/response.js';

export const getAll = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.id, isRead: false },
    });
    return sendSuccess(res, { notifications, unreadCount });
  } catch (error) { next(error); }
};

export const markRead = async (req, res, next) => {
  try {
    const updated = await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), userId: req.user.id },
      data: { isRead: true },
    });
    if (updated.count === 0) {
      return sendError(res, 'Notification not found.', 404);
    }
    return sendSuccess(res, null, 'Notification marked as read.');
  } catch (error) { next(error); }
};

export const markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, isRead: false },
      data: { isRead: true },
    });
    return sendSuccess(res, null, 'All notifications marked as read.');
  } catch (error) { next(error); }
};

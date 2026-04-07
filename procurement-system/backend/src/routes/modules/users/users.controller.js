import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';

export const getAll = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      include: { role: true },
      omit: { password: true, refreshToken: true },
      orderBy: { createdAt: 'desc' },
    });
    const mapped = users.map(u => ({ ...u, role: u.role.name }));
    return sendSuccess(res, mapped, 'Users retrieved.');
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager' && req.user.id !== id) {
      return sendError(res, 'Access denied.', 403);
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: { role: true },
      omit: { password: true, refreshToken: true },
    });
    if (!user) return sendError(res, 'User not found.', 404);
    return sendSuccess(res, { ...user, role: user.role.name });
  } catch (error) { next(error); }
};

export const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager' && req.user.id !== id) {
      return sendError(res, 'Access denied.', 403);
    }
    const { name, phone, department, roleId, isActive } = req.body;
    const data = {};
    if (name) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (department !== undefined) data.department = department;
    if (req.user.role === 'Admin') {
      if (roleId) data.roleId = roleId;
      if (isActive !== undefined) data.isActive = isActive;
    }
    const user = await prisma.user.update({
      where: { id },
      data,
      include: { role: true },
      omit: { password: true, refreshToken: true },
    });
    return sendSuccess(res, { ...user, role: user.role.name }, 'User updated.');
  } catch (error) { next(error); }
};

export const remove = async (req, res, next) => {
  try {
    await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { isActive: false },
    });
    return sendSuccess(res, null, 'User deactivated.');
  } catch (error) { next(error); }
};

// Audit Logs - Admin only
export const getAuditLogs = async (req, res, next) => {
  try {
    const { entity, action, userId, limit = 100 } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (userId) where.userId = parseInt(userId);

    const logs = await prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });
    return sendSuccess(res, logs, 'Audit logs retrieved.');
  } catch (error) { next(error); }
};

export const getRoles = async (req, res, next) => {
  try {
    const roles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
    return sendSuccess(res, roles, 'Roles retrieved.');
  } catch (error) { next(error); }
};

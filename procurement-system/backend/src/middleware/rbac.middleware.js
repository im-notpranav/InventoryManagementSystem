import { sendError } from '../utils/response.js';

export const rbac = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401);
    }
    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, 'Access denied. Insufficient permissions.', 403);
    }
    next();
  };
};

export const blockVendor = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required.', 401);
  }
  if (req.user.role === 'Vendor') {
    return sendError(res, 'Access denied. Vendors can only access vendor portal APIs.', 403);
  }
  return next();
};

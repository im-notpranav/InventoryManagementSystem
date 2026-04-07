import prisma from '../config/db.js';

export const auditMiddleware = (action, entity) => {
  return async (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      // Only log on successful operations
      if (body?.success) {
        try {
          await prisma.auditLog.create({
            data: {
              userId: req.user?.id || null,
              action,
              entity,
              entityId: parseInt(req.params?.id) || body?.data?.id || null,
              details: JSON.stringify({
                method: req.method,
                path: req.originalUrl,
                body: req.method !== 'GET' ? req.body : undefined,
              }),
              ipAddress: req.ip || req.connection?.remoteAddress,
            },
          });
        } catch (err) {
          console.error('Audit log error:', err.message);
        }
      }
      return originalJson(body);
    };
    next();
  };
};

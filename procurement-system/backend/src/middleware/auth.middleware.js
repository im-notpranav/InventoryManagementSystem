const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const prisma = require('../config/db');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
  try {
    // Department and role scope every query, so take them from the database, not the
    // token: a department change or deactivation must apply without a new login.
    const current = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: { department: true, is_active: true, role: { select: { role_name: true } } },
    });
    if (!current || !current.is_active) {
      return res.status(401).json({ success: false, message: 'Account is inactive. Please contact the administrator.' });
    }
    req.user.department = current.department;
    req.user.role = current.role?.role_name || req.user.role;
    return next();
  } catch (err) {
    return next(err);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user)
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({
      success: false,
      message: `Access denied. Required: ${roles.join(' or ')}`
    });
  next();
};

module.exports = { requireAuth, requireRole };

const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token provided' });
  const token = authHeader.split(' ')[1];
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
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

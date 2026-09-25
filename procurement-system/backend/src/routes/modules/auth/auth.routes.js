import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, register, refresh, logout, me } from './auth.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import env from '../../../config/env.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

const refreshOriginGuard = (req, res, next) => {
  const origin = req.get('origin');
  if (origin && origin !== env.FRONTEND_URL) {
    return res.status(403).json({ success: false, message: 'Invalid request origin.' });
  }
  return next();
};

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refreshOriginGuard, refresh);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);

export default router;

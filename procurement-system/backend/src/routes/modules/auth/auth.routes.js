import { Router } from 'express';
import { login, register, refresh, logout, me } from './auth.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, me);

export default router;

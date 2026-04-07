import { Router } from 'express';
import { query, getHistory } from './chatbot.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';

const router = Router();
router.use(authMiddleware);
router.post('/query', query);
router.get('/history', getHistory);

export default router;

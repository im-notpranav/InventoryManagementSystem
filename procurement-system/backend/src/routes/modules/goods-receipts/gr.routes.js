import { Router } from 'express';
import { getAll, create } from './gr.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', getAll);
router.post('/', rbac('Admin', 'Manager'), create);  // Only Admin/Manager can record goods receipts

export default router;

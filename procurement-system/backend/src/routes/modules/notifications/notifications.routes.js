import { Router } from 'express';
import { getAll, markRead, markAllRead } from './notifications.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { blockVendor } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);
router.use(blockVendor);
router.get('/', getAll);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);

export default router;

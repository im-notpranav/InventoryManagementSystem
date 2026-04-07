import { Router } from 'express';
import { getAll, getById, create, updateStatus, verifyMatch } from './invoices.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbac('Admin', 'Manager'), getAll);
router.get('/:id', rbac('Admin', 'Manager'), getById);
router.post('/', rbac('Admin', 'Manager'), create);
router.put('/:id/status', rbac('Admin', 'Manager'), updateStatus);
router.post('/:id/verify-match', rbac('Admin', 'Manager'), verifyMatch);

export default router;

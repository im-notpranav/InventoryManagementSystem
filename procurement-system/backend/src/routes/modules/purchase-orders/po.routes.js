import { Router } from 'express';
import { getAll, getById, create, update } from './po.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { blockVendor, rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);
router.use(blockVendor);

router.get('/', rbac('Admin', 'Manager'), getAll);
router.get('/:id', rbac('Admin', 'Manager'), getById);
router.post('/', rbac('Admin', 'Manager'), create);
router.put('/:id', rbac('Admin', 'Manager'), update);

export default router;

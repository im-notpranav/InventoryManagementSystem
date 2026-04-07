import { Router } from 'express';
import { getAll, getById, update, remove, getAuditLogs, getRoles } from './users.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();

router.use(authMiddleware);
router.get('/audit-logs', rbac('Admin'), getAuditLogs);
router.get('/roles', rbac('Admin'), getRoles);
router.get('/', rbac('Admin'), getAll);
router.get('/:id', getById);
router.put('/:id', update);
router.delete('/:id', rbac('Admin'), remove);

export default router;

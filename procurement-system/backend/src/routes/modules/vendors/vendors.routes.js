import { Router } from 'express';
import { getAll, getById, create, update, remove, createUserAccount, syncAllVendorAccounts } from './vendors.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', rbac('Admin', 'Manager'), getAll);
router.get('/:id', rbac('Admin', 'Manager'), getById);
router.post('/', rbac('Admin', 'Manager'), create);
router.put('/:id', rbac('Admin', 'Manager'), update);
router.delete('/:id', rbac('Admin'), remove);

// Create user account for existing vendor
router.post('/:id/create-account', rbac('Admin'), createUserAccount);

// Sync all vendors - create accounts for any vendor without a user account
router.post('/sync-accounts', rbac('Admin'), syncAllVendorAccounts);

export default router;

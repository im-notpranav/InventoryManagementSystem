// CORRECT REORDER LOGIC:
// ON GOODS RECEIPT  → inventory += receivedQty → NO reorder check
// ON INVENTORY ISSUE → inventory -= issuedQty  → CHECK reorder point
// Never trigger reorder alerts when receiving stock, only when consuming it

import { Router } from 'express';
import { getAll, getLowStock, getById, adjust, getDashboardStats } from './inventory.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { blockVendor, rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);
router.use(blockVendor);

router.get('/stats', getDashboardStats);
router.get('/low-stock', getLowStock);
router.get('/', getAll);
router.get('/:id', getById);
router.put('/:id', rbac('Admin', 'Manager'), adjust);

export default router;

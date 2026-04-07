import { Router } from 'express';
import { getAll, create, getExpiring, updateWarranty, getAllSubscriptions, getExpiringSubscriptions, createSubscription, updateSubscription, deleteSubscription } from './warranties.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);

// Warranties
router.get('/expiring', getExpiring);
router.get('/', getAll);
router.post('/', rbac('Admin', 'Manager'), create);
router.put('/:id', rbac('Admin', 'Manager'), updateWarranty);

// Subscriptions
router.get('/subscriptions/expiring', getExpiringSubscriptions);
router.get('/subscriptions', getAllSubscriptions);
router.post('/subscriptions', rbac('Admin', 'Manager'), createSubscription);
router.put('/subscriptions/:id', rbac('Admin', 'Manager'), updateSubscription);
router.delete('/subscriptions/:id', rbac('Admin'), deleteSubscription);

export default router;

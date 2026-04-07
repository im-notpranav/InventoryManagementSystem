import { Router } from 'express';
import { getAll, getById, create, update, remove, getAllCategories, createCategory, updateCategory, deleteCategory } from './products.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);

// Categories
router.get('/categories', getAllCategories);
router.post('/categories', rbac('Admin', 'Manager'), createCategory);
router.put('/categories/:id', rbac('Admin', 'Manager'), updateCategory);
router.delete('/categories/:id', rbac('Admin'), deleteCategory);

// Products
router.get('/', getAll);
router.get('/:id', getById);
router.post('/', rbac('Admin', 'Manager'), create);
router.put('/:id', rbac('Admin', 'Manager'), update);
router.delete('/:id', rbac('Admin'), remove);

export default router;

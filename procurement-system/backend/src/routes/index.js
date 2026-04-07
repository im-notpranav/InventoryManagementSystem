import { Router } from 'express';
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import vendorRoutes from './modules/vendors/vendors.routes.js';
import vendorPortalRoutes from './modules/vendors/vendor-portal.routes.js';
import productRoutes from './modules/products/products.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import purchaseRequestRoutes from './modules/purchase-requests/pr.routes.js';
import rfqRoutes from './modules/purchase-requests/rfq.routes.js';
import purchaseOrderRoutes from './modules/purchase-orders/po.routes.js';
import goodsReceiptRoutes from './modules/goods-receipts/gr.routes.js';
import invoiceRoutes from './modules/invoices/invoices.routes.js';
import warrantyRoutes from './modules/warranties/warranties.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import chatbotRoutes from './modules/chatbot/chatbot.routes.js';
import testEmailRoutes from './modules/test-email.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/vendors', vendorRoutes);
router.use('/vendor-portal', vendorPortalRoutes);
router.use('/products', productRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchase-requests', purchaseRequestRoutes);
router.use('/rfq', rfqRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/goods-receipts', goodsReceiptRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/warranties', warrantyRoutes);
router.use('/notifications', notificationRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/test-email', testEmailRoutes);

export default router;

import { Router } from 'express';
import { 
  getAllRFQs, 
  getRFQById, 
  createRFQ, 
  addVendorsToRFQ,
  closeRFQ, 
  submitQuotation, 
  getQuotations, 
  selectQuotation 
} from './rfq.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);

// RFQ Management (Admin/Manager)
router.get('/', rbac('Admin', 'Manager'), getAllRFQs);
router.get('/:id', rbac('Admin', 'Manager'), getRFQById);
router.post('/', rbac('Admin', 'Manager'), createRFQ);
router.post('/:id/add-vendors', rbac('Admin', 'Manager'), addVendorsToRFQ);  // Add more vendors
router.put('/:id/close', rbac('Admin', 'Manager'), closeRFQ);

// Quotations
router.get('/:rfqId/quotations', rbac('Admin', 'Manager'), getQuotations);
router.post('/quotations', rbac('Vendor'), submitQuotation); // Vendor submits quotation
router.post('/quotations/:quotationId/select', rbac('Admin', 'Manager'), selectQuotation);

export default router;

import { Router } from 'express';
import { 
  getAllRFQs, 
  getRFQById, 
  createRFQ, 
  addVendorsToRFQ,
  closeRFQ, 
  submitQuotation, 
  getQuotations, 
  selectQuotation,
  sendRFQInvite,
  resendRFQInvite,
  compareQuotes,
  selectQuoteDecision
} from './rfq.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { blockVendor, rbac } from '../../../middleware/rbac.middleware.js';

const router = Router();
router.use(authMiddleware);
router.use((req, res, next) => {
  // Vendors can only use the dedicated vendor portal endpoints.
  if (req.user?.role === 'Vendor') {
    return blockVendor(req, res, next);
  }
  return next();
});

// RFQ Management (Admin/Manager)
router.get('/', rbac('Admin', 'Manager'), getAllRFQs);
router.post('/', rbac('Admin', 'Manager'), createRFQ);
router.post('/:id/add-vendors', rbac('Admin', 'Manager'), addVendorsToRFQ);  // Add more vendors
router.put('/:id/close', rbac('Admin', 'Manager'), closeRFQ);

// User-requested custom RFQ logic
router.post('/send', rbac('Admin', 'Manager'), sendRFQInvite);
router.post('/:quote_id/resend', rbac('Admin', 'Manager'), resendRFQInvite);
router.get('/compare/:request_id', rbac('Admin', 'Manager'), compareQuotes);
router.post('/:quote_id/select', rbac('Admin', 'Manager'), selectQuoteDecision);
router.get('/:id', rbac('Admin', 'Manager'), getRFQById);

// Quotations
router.get('/:rfqId/quotations', rbac('Admin', 'Manager'), getQuotations);
router.post('/quotations', rbac('Admin', 'Manager'), submitQuotation);
router.post('/quotations/:quotationId/select', rbac('Admin', 'Manager'), selectQuotation);

export default router;

import { Router } from 'express';
import { getAll, getById, create, approve, reject } from './pr.controller.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { blockVendor, rbac } from '../../../middleware/rbac.middleware.js';
import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';

const router = Router();
router.use(authMiddleware);
router.use(blockVendor);

router.get('/', getAll);
// GET /approved - Get all approved purchase requests (for vendors to view)
// This allows vendors to see approved PRs to understand what's available for quotation
router.get('/status/approved', rbac('Admin', 'Manager'), async (req, res, next) => {
  try {
    const approvedRequests = await prisma.purchaseRequest.findMany({
      where: {
        status: { in: ['approved', 'rfq_sent', 'Approved', 'RFQ_Sent'] },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, price: true },
            },
          },
        },
        user: { select: { name: true, department: true } },
        rfqs: {
          where: { status: { in: ['Open', 'open'] } },
          select: { id: true, rfqNo: true, deadline: true, status: true },
        },
      },
      orderBy: { approvedAt: 'desc' },
    });

    return sendSuccess(res, approvedRequests);
  } catch (error) {
    next(error);
  }
});
router.get('/:id', getById);
router.post('/', create);
router.put('/:id/approve', rbac('Admin', 'Manager'), approve);
router.put('/:id/reject', rbac('Admin', 'Manager'), reject);

export default router;

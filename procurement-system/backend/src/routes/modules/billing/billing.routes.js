import { Router } from 'express';
import prisma from '../../../config/db.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import upload from '../../../utils/fileUpload.js';

const router = Router();

const isAdminRole = (role) => role === 'Admin' || role === 'Manager';

// POST /api/billing/:entry_id/upload-invoice
// Admin In-charge uploads scanned invoice
router.post('/:entry_id/upload-invoice',
  authMiddleware,
  rbac('Admin', 'Manager'),
  upload.single('scanned_invoice'),
  async (req, res, next) => {
    try {
      const entry_id = parseInt(req.params.entry_id);

      if (!req.file) {
        return sendError(res, 'Scanned invoice required', 400);
      }

      const billingDoc = await prisma.billingDocument.findUnique({
        where: { entry_id },
      });

      if (!billingDoc) return sendError(res, 'Billing document not found for this entry.', 404);

      const updated = await prisma.billingDocument.update({
        where: { doc_id: billingDoc.doc_id },
        data: {
          scanned_invoice_url: req.file.path,
          uploaded_by: req.body.uploaded_by ? parseInt(req.body.uploaded_by) : req.user.id,
          uploaded_at: new Date(),
          status: 'uploaded',
        },
        include: { entry: { include: { wo: { include: { vendor: true } } } } },
      });

      return sendSuccess(res, updated, 'Scanned invoice uploaded successfully.');
    } catch (error) { next(error); }
  }
);

// POST /api/billing/:doc_id/watchman-confirm
// Watchman confirms document receipt
router.post('/:doc_id/watchman-confirm',
  authMiddleware,
  rbac('Watchman', 'Admin'),
  async (req, res, next) => {
    try {
      const doc_id = parseInt(req.params.doc_id);
      const billingDoc = await prisma.billingDocument.findUnique({
        where: { doc_id },
      });

      if (!billingDoc) return sendError(res, 'Billing document not found.', 404);

      const updateData = {
        watchman_confirmed: true,
        watchman_confirmed_by: req.user.id,
        watchman_confirmed_at: new Date(),
      };

      if (billingDoc.admin_signed) {
        updateData.status = 'both_signed';
        updateData.status = 'ready_for_accountant';
        console.log('Document ready for accountant review');
      } else {
        updateData.status = 'uploaded';
      }

      const updated = await prisma.billingDocument.update({
        where: { doc_id },
        data: updateData,
      });

      return sendSuccess(res, updated, 'Watchman confirmation recorded.');
    } catch (error) { next(error); }
  }
);

// POST /api/billing/:doc_id/admin-sign
// Admin In-charge signs off
router.post('/:doc_id/admin-sign',
  authMiddleware,
  rbac('Admin', 'Manager'),
  async (req, res, next) => {
    try {
      const doc_id = parseInt(req.params.doc_id);
      const billingDoc = await prisma.billingDocument.findUnique({
        where: { doc_id },
      });

      if (!billingDoc) return sendError(res, 'Billing document not found.', 404);
      if (!billingDoc.scanned_invoice_url) {
        return sendError(res, 'Cannot sign until scanned invoice is uploaded', 400);
      }

      const updateData = {
        admin_signed: true,
        admin_signed_by: req.user.id,
        admin_signed_at: new Date(),
      };

      // Check if watchman also confirmed → both_signed → ready_for_accountant
      if (billingDoc.watchman_confirmed) {
        updateData.status = 'ready_for_accountant';
        console.log('Document ready for accountant review');
      } else {
        updateData.status = 'uploaded'; // Wait for watchman confirmation
      }

      const updated = await prisma.billingDocument.update({
        where: { doc_id },
        data: updateData,
      });

      // Update PR status if both signed
      if (updated.status === 'ready_for_accountant') {
        const entry = await prisma.gateEntry.findUnique({
          where: { entry_id: billingDoc.entry_id },
          include: { wo: true },
        });
        if (entry) {
          await prisma.purchaseRequest.update({
            where: { id: entry.wo.request_id },
            data: { status: 'documents_uploaded' },
          });
        }
      }

      return sendSuccess(res, updated, 'Admin signature recorded.');
    } catch (error) { next(error); }
  }
);

// POST /api/billing/:doc_id/accountant-verify
// Accountant verifies and releases bill
router.post('/:doc_id/accountant-verify',
  authMiddleware,
  rbac('Accountant', 'Admin'),
  async (req, res, next) => {
    try {
      const doc_id = parseInt(req.params.doc_id);
      const { accountant_remarks } = req.body;

      const billingDoc = await prisma.billingDocument.findUnique({
        where: { doc_id },
        include: {
          entry: {
            include: {
              wo: {
                include: { vendor: true, request: true },
              },
            },
          },
        },
      });

      if (!billingDoc) return sendError(res, 'Billing document not found.', 404);
      if (!billingDoc.scanned_invoice_url) return sendError(res, 'Missing scanned physical invoice upload', 400);
      if (!billingDoc.watchman_confirmed) return sendError(res, 'Missing watchman confirmation', 400);
      if (!billingDoc.admin_signed) return sendError(res, 'Missing admin sign-off', 400);
      if (billingDoc.status !== 'ready_for_accountant') return sendError(res, 'Document is not ready_for_accountant', 400);

      const updated = await prisma.billingDocument.update({
        where: { doc_id },
        data: {
          accountant_verified: true,
          accountant_verified_by: req.user.id,
          accountant_verified_at: new Date(),
          bill_released: true,
          bill_released_at: new Date(),
          accountant_remarks: accountant_remarks || null,
          status: 'released',
        },
      });

      // Update PR status to bill_released
      if (billingDoc.entry?.wo?.request_id) {
        await prisma.purchaseRequest.update({
          where: { id: billingDoc.entry.wo.request_id },
          data: { status: 'bill_released' },
        });
      }

      console.log('Bill released for payment');

      return sendSuccess(res, updated, 'Bill verified and released for payment.');
    } catch (error) { next(error); }
  }
);

// GET /api/billing/pending
// Accountant sees all docs ready for review
router.get('/pending',
  authMiddleware,
  rbac('Accountant', 'Admin'),
  async (req, res, next) => {
    try {
      const docs = await prisma.billingDocument.findMany({
        where: { status: 'ready_for_accountant' },
        include: {
          entry: {
            include: {
              wo: {
                include: {
                  vendor: { select: { id: true, name: true } },
                  request: { select: { id: true, pr_number: true, requestNo: true } },
                  submission: { select: { proforma_file_url: true, quotation_file_url: true } },
                },
              },
              watchman: { select: { id: true, name: true } },
            },
          },
          uploader: { select: { id: true, name: true } },
          watchman_user: { select: { id: true, name: true } },
          admin_user: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
      });
      return sendSuccess(res, docs);
    } catch (error) { next(error); }
  }
);

// GET /api/billing/:doc_id
// Full document details
router.get('/:doc_id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const doc_id = parseInt(req.params.doc_id);
      if (isNaN(doc_id)) return sendError(res, 'Invalid document ID.', 400);

      const doc = await prisma.billingDocument.findUnique({
        where: { doc_id },
        include: {
          entry: {
            include: {
              wo: {
                include: {
                  vendor: true,
                  request: { include: { user: { select: { id: true, name: true, department: true } } } },
                  submission: true,
                },
              },
              watchman: { select: { id: true, name: true } },
            },
          },
          uploader: { select: { id: true, name: true } },
          watchman_user: { select: { id: true, name: true } },
          admin_user: { select: { id: true, name: true } },
          accountant_user: { select: { id: true, name: true } },
        },
      });

      if (!doc) return sendError(res, 'Billing document not found.', 404);
      if (!isAdminRole(req.user.role) && req.user.role !== 'Accountant' && req.user.role !== 'Watchman') {
        return sendError(res, 'Access denied.', 403);
      }
      return sendSuccess(res, doc);
    } catch (error) { next(error); }
  }
);

// GET /api/billing
// Admin sees all billing documents
router.get('/',
  authMiddleware,
  rbac('Admin', 'Manager', 'Accountant'),
  async (req, res, next) => {
    try {
      const docs = await prisma.billingDocument.findMany({
        include: {
          entry: {
            include: {
              wo: {
                include: {
                  vendor: { select: { id: true, name: true } },
                  request: { select: { id: true, pr_number: true, requestNo: true } },
                },
              },
              watchman: { select: { id: true, name: true } },
            },
          },
          uploader: { select: { id: true, name: true } },
          accountant_user: { select: { id: true, name: true } },
        },
        orderBy: { created_at: 'desc' },
      });
      return sendSuccess(res, docs);
    } catch (error) { next(error); }
  }
);

export default router;

import { Router } from 'express';
import prisma from '../../../config/db.js';
import { authMiddleware } from '../../../middleware/auth.middleware.js';
import { rbac } from '../../../middleware/rbac.middleware.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import { generateGENumber } from '../../../utils/generateNumbers.js';

const router = Router();

const isPrivileged = (role) => ['Admin', 'Manager', 'Watchman', 'Accountant'].includes(role);

// POST /api/gate-entry/record
// Watchman records delivery at gate
router.post('/record',
  authMiddleware,
  rbac('Watchman', 'Admin'),
  async (req, res, next) => {
    try {
      const { wo_id, vehicle_number, driver_name, num_packages, tax_invoice_number, recorded_by } = req.body;

      if (!wo_id || !vehicle_number || !driver_name || !num_packages || !tax_invoice_number) {
        return sendError(res, 'All fields are required: wo_id, vehicle_number, driver_name, num_packages, tax_invoice_number', 400);
      }

      // Find the work order
      const workOrder = await prisma.workOrder.findUnique({
        where: { wo_id: parseInt(wo_id) },
        include: { vendor: true },
      });

      if (!workOrder) return sendError(res, 'Work order not found.', 404);
      if (workOrder.status !== 'dispatched') {
        return sendError(res, 'Work order must be in "dispatched" status for gate entry.', 400);
      }

      // Check if gate entry already exists for this WO
      const existingEntry = await prisma.gateEntry.findUnique({
        where: { wo_id: parseInt(wo_id) },
      });
      if (existingEntry) {
        return sendError(res, 'Gate entry already recorded for this work order.', 400);
      }

      // Cross-check tax invoice number against vendor upload
      const invoiceMatch = workOrder.tax_invoice_number &&
        workOrder.tax_invoice_number.trim().toLowerCase() === tax_invoice_number.trim().toLowerCase();

      const entry_number = await generateGENumber();

      let status, block_reason, gate_pass_issued;

      if (invoiceMatch) {
        status = 'verified';
        block_reason = null;
        gate_pass_issued = true;
      } else {
        status = 'blocked';
        block_reason = `Tax invoice number mismatch. Expected: ${workOrder.tax_invoice_number} Got: ${tax_invoice_number}`;
        gate_pass_issued = false;
        console.log('ALERT: Gate entry blocked - invoice mismatch');
      }

      // Create gate entry and billing document in transaction
      const result = await prisma.$transaction(async (tx) => {
        const gateEntry = await tx.gateEntry.create({
          data: {
            entry_number,
            wo_id: parseInt(wo_id),
            recorded_by: recorded_by ? parseInt(recorded_by) : req.user.id,
            vehicle_number: vehicle_number.toUpperCase(),
            driver_name,
            num_packages: parseInt(num_packages),
            tax_invoice_number,
            invoice_verified: invoiceMatch,
            status,
            block_reason,
            gate_pass_issued,
          },
          include: { wo: { include: { vendor: true } }, watchman: { select: { id: true, name: true } } },
        });

        // Create empty BillingDocument linked to this entry
        const billingDoc = await tx.billingDocument.create({
          data: {
            entry_id: gateEntry.entry_id,
          },
        });

        // Update PR status if verified
        if (invoiceMatch) {
          await tx.purchaseRequest.update({
            where: { id: workOrder.request_id },
            data: { status: 'at_gate' },
          });
        }

        return { gateEntry, billingDoc };
      });

      return sendSuccess(res, {
        gateEntry: {
          ...result.gateEntry,
          billing_document: result.billingDoc,
        },
        isVerified: invoiceMatch,
        gatePass: invoiceMatch ? {
          entry_number: result.gateEntry.entry_number,
          timestamp: result.gateEntry.entry_time,
          vendor_name: workOrder.vendor.name,
          items_description: workOrder.items_description,
          vehicle_number: result.gateEntry.vehicle_number,
        } : null,
      }, invoiceMatch ? 'Gate entry recorded and verified.' : 'Gate entry blocked due to invoice mismatch.', invoiceMatch ? 201 : 200);
    } catch (error) { next(error); }
  }
);

// GET /api/gate-entry/today
// Today's entries for watchman dashboard
router.get('/today',
  authMiddleware,
  rbac('Watchman', 'Admin', 'Manager', 'Accountant'),
  async (req, res, next) => {
    try {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const entries = await prisma.gateEntry.findMany({
        where: {
          entry_time: {
            gte: start,
            lt: end,
          },
        },
        include: {
          wo: {
            include: {
              vendor: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { entry_time: 'desc' },
      });

      return sendSuccess(res, entries);
    } catch (error) { next(error); }
  }
);

// GET /api/gate-entry/:entry_id
// Get gate entry details
router.get('/:entry_id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const entry_id = parseInt(req.params.entry_id);
      if (isNaN(entry_id)) return sendError(res, 'Invalid entry ID.', 400);

      const entry = await prisma.gateEntry.findUnique({
        where: { entry_id },
        include: {
          wo: {
            include: {
              vendor: true,
              request: { select: { id: true, pr_number: true, requestNo: true } },
              submission: { select: { submission_id: true, proforma_file_url: true, quotation_file_url: true } },
            },
          },
          watchman: { select: { id: true, name: true } },
          billing_document: true,
        },
      });

      if (!entry) return sendError(res, 'Gate entry not found.', 404);
      if (!isPrivileged(req.user.role)) return sendError(res, 'Access denied.', 403);
      return sendSuccess(res, entry);
    } catch (error) { next(error); }
  }
);

// GET /api/gate-entry
// Admin/Accountant views all gate entries
router.get('/',
  authMiddleware,
  rbac('Admin', 'Manager', 'Watchman', 'Accountant'),
  async (req, res, next) => {
    try {
      const entries = await prisma.gateEntry.findMany({
        include: {
          wo: {
            include: {
              vendor: { select: { id: true, name: true } },
              request: { select: { id: true, pr_number: true, requestNo: true } },
            },
          },
          watchman: { select: { id: true, name: true } },
          billing_document: { select: { doc_id: true, status: true } },
        },
        orderBy: { entry_time: 'desc' },
      });
      return sendSuccess(res, entries);
    } catch (error) { next(error); }
  }
);

export default router;

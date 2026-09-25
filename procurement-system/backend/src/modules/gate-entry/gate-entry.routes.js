const express = require('express');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { generateGENumber } = require('../../utils/generateNumbers');
const { sendGateBlockedAlert } = require('../../utils/mailer');

const router = express.Router();

// POST — Record gate entry (Watchman)
router.post('/record', requireAuth, requireRole('Watchman', 'Admin'), async (req, res, next) => {
  try {
    const { wo_number, vehicle_number, driver_name, num_packages, tax_invoice_number } = req.body;
    if (!wo_number || !vehicle_number || !driver_name || !num_packages || !tax_invoice_number) {
      return fail(res, 'All fields are required: WO number, vehicle, driver, packages, invoice number');
    }

    // Look up WO by number
    const wo = await prisma.workOrder.findUnique({
      where: { wo_number },
      include: { vendor: true, request: { include: { product: true } } }
    });
    if (!wo) return fail(res, 'Work order not found', 404);
    if (wo.status !== 'dispatched') return fail(res, 'Work order has not been dispatched yet');

    // Check if gate entry already exists for this WO
    const existingEntry = await prisma.gateEntry.findUnique({ where: { wo_id: wo.wo_id } });
    if (existingEntry) return fail(res, 'Gate entry already recorded for this work order');

    // Cross-check tax invoice numbers
    const invoiceMatch = wo.tax_invoice_number?.trim() === tax_invoice_number.trim();

    const entryNum = await generateGENumber();

    if (invoiceMatch) {
      // VERIFIED — create entry + billing document
      const result = await prisma.$transaction(async (tx) => {
        const entry = await tx.gateEntry.create({
          data: {
            entry_number: entryNum,
            wo_id: wo.wo_id,
            recorded_by: req.user.user_id,
            vehicle_number: vehicle_number.toUpperCase(),
            driver_name,
            num_packages: parseInt(num_packages),
            tax_invoice_number,
            invoice_verified: true,
            status: 'verified',
            gate_pass_issued: true,
          }
        });

        // Auto-create billing document
        const billingDoc = await tx.billingDocument.create({
          data: {
            entry_id: entry.entry_id,
            status: 'pending',
          }
        });

        // Update PR status to 'at_gate'
        if (wo.request_id) {
          await tx.purchaseRequest.update({
            where: { request_id: wo.request_id },
            data: { status: 'at_gate' },
          }).catch(e => console.warn('[GATE] PR status update failed:', e.message));
        }

        return { entry, billingDoc };
      });

      return ok(res, {
        verified: true,
        entry: result.entry,
        billing_doc: result.billingDoc,
        vendor_name: wo.vendor?.vendor_name,
        items: wo.items_description,
        message: '✅ ENTRY VERIFIED — Gate pass issued'
      }, 'Gate entry recorded and verified');

    } else {
      // BLOCKED — invoice mismatch
      const entry = await prisma.gateEntry.create({
        data: {
          entry_number: entryNum,
          wo_id: wo.wo_id,
          recorded_by: req.user.user_id,
          vehicle_number: vehicle_number.toUpperCase(),
          driver_name,
          num_packages: parseInt(num_packages),
          tax_invoice_number,
          invoice_verified: false,
          status: 'blocked',
          block_reason: `Invoice mismatch: expected "${wo.tax_invoice_number}", received "${tax_invoice_number}"`,
          gate_pass_issued: false,
        }
      });

      // Update PR status to 'at_gate' even if blocked
      if (wo.request_id) {
        await prisma.purchaseRequest.update({
          where: { request_id: wo.request_id },
          data: { status: 'at_gate' },
        }).catch(e => console.warn('[GATE] PR status update failed:', e.message));
      }

      // Send gate blocked alert to admin (fire-and-forget)
      try {
        const adminUser = await prisma.user.findFirst({
          where: { role: { role_name: 'Admin' }, is_active: true }
        });
        if (adminUser?.email) {
          await sendGateBlockedAlert({
            to: adminUser.email,
            entryNumber: entryNum,
            woNumber: wo.wo_number,
            vendorName: wo.vendor?.vendor_name || 'Unknown',
            expectedInvoice: wo.tax_invoice_number,
            enteredInvoice: tax_invoice_number,
          });
        }
      } catch (mailErr) {
        console.error('[GATE] Block alert email failed:', mailErr.message);
      }

      return ok(res, {
        verified: false,
        entry,
        expected_invoice: wo.tax_invoice_number,
        entered_invoice: tax_invoice_number,
        message: '❌ ENTRY BLOCKED — Invoice number mismatch'
      }, 'Gate entry blocked — invoice mismatch');
    }
  } catch (err) { next(err); }
});

// GET — Search work order by number (for watchman to look up)
router.get('/lookup-wo/:wo_number', requireAuth, async (req, res, next) => {
  try {
    const wo_number = req.params.wo_number?.trim();
    if (!wo_number || !/^WO-\d{4}-[A-Z]+-\d{4}$/i.test(wo_number)) {
      return fail(res, 'Invalid work order number format. Expected format: WO-YYYY-DEPT-NNNN', 400);
    }

    const wo = await prisma.workOrder.findUnique({
      where: { wo_number },
      include: {
        vendor: true,
        request: { include: { product: true } }
      }
    });
    if (!wo) return fail(res, 'Work order not found', 404);
    return ok(res, {
      wo_id: wo.wo_id,
      wo_number: wo.wo_number,
      vendor_name: wo.vendor?.vendor_name,
      items: wo.items_description,
      quantity: wo.quantity,
      expected_delivery: wo.expected_delivery,
      tax_invoice_number: wo.tax_invoice_number,
      status: wo.status,
      product_name: wo.request?.product?.name,
    });
  } catch (err) { next(err); }
});

// GET — All gate entries
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { filter } = req.query;
    const where = {};

    if (filter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      where.entry_time = { gte: today };
    } else if (filter === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      where.entry_time = { gte: weekAgo };
    }

    const entries = await prisma.gateEntry.findMany({
      where,
      include: {
        wo: { include: { vendor: true, request: { include: { product: true } } } },
        watchman: { select: { name: true } }
      },
      orderBy: { entry_time: 'desc' }
    });
    return ok(res, entries);
  } catch (err) { next(err); }
});

// GET — Billing docs awaiting watchman confirmation
router.get('/pending-confirmations', requireAuth, requireRole('Watchman'), async (req, res, next) => {
  try {
    const docs = await prisma.billingDocument.findMany({
      where: {
        scanned_invoice_url: { not: null },
        watchman_confirmed: false,
      },
      include: {
        entry: {
          include: {
            wo: {
              include: {
                vendor: true,
                submission: true,
                request: { include: { product: true } }
              }
            }
          }
        },
        uploader: { select: { name: true } },
      },
      orderBy: { created_at: 'desc' }
    });
    return ok(res, docs);
  } catch (err) { next(err); }
});

module.exports = router;

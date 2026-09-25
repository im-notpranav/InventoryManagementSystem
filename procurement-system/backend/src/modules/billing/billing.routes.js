const express = require('express');
const router = express.Router();
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const upload = require('../../utils/fileUpload');
const { sendBillReadyEmail } = require('../../utils/mailer');

// ── FULL NESTED INCLUDE (used in multiple endpoints) ──────────
const FULL_INCLUDE = {
  entry: {
    include: {
      wo: {
        include: {
          vendor: { select: { vendor_id: true, vendor_name: true, email: true } },
          submission: {
            include: {
              request: {
                include: {
                  product: { select: { name: true, sku: true, unit: true } },
                  items: { include: { product: true } },
                },
              },
            },
          },
          request: {
            include: {
              product: { select: { name: true, sku: true } },
              items: { include: { product: true } },
            },
          },
        },
      },
      watchman: { select: { name: true, email: true } },
    },
  },
  uploader: { select: { name: true, email: true } },
  watchman_user: { select: { name: true } },
  admin_user: { select: { name: true } },
  accountant_user: { select: { name: true } },
};

// ── GET /api/billing ─────────────────────────────────────────
// Returns billing docs filtered by role
router.get('/', requireAuth, async (req, res) => {
  try {
    let where = {};

    if (req.user.role === 'Accountant') {
      // Accountant sees: ready_for_accountant AND released
      where = { status: { in: ['ready_for_accountant', 'released'] } };
    } else if (req.user.role === 'Watchman') {
      // Security sees: docs needing their confirmation
      where = {
        scanned_invoice_url: { not: null },
        watchman_confirmed: false,
      };
    }
    // Admin sees all

    const docs = await prisma.billingDocument.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { created_at: 'desc' },
    });

    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error('[BILLING GET ALL]', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/billing/pending ─────────────────────────────────
// Accountant: bills ready for review
router.get('/pending', requireAuth, requireRole('Accountant', 'Admin'), async (req, res) => {
  try {
    const docs = await prisma.billingDocument.findMany({
      where: { status: 'ready_for_accountant' },
      include: FULL_INCLUDE,
      orderBy: { created_at: 'asc' },
    });
    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error('[BILLING PENDING]', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/billing/released ────────────────────────────────
// Released bills
router.get('/released', requireAuth, async (req, res) => {
  try {
    const docs = await prisma.billingDocument.findMany({
      where: { bill_released: true },
      include: FULL_INCLUDE,
      orderBy: { bill_released_at: 'desc' },
    });
    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error('[BILLING RELEASED]', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/billing/watchman-queue ─────────────────────────
// Security: docs waiting for their confirmation
router.get('/watchman-queue', requireAuth, requireRole('Watchman', 'Admin'), async (req, res) => {
  try {
    const docs = await prisma.billingDocument.findMany({
      where: {
        scanned_invoice_url: { not: null },
        watchman_confirmed: false,
      },
      include: FULL_INCLUDE,
      orderBy: { uploaded_at: 'asc' },
    });
    return res.json({ success: true, data: docs });
  } catch (err) {
    console.error('[BILLING WATCHMAN QUEUE]', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/billing/:doc_id ─────────────────────────────────
router.get('/:doc_id', requireAuth, async (req, res) => {
  try {
    const doc = await prisma.billingDocument.findUnique({
      where: { doc_id: parseInt(req.params.doc_id) },
      include: FULL_INCLUDE,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[BILLING GET ONE]', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/billing/:entry_id/upload-invoice ───────────────
router.post(
  '/:entry_id/upload-invoice',
  requireAuth, requireRole('Admin'),
  upload.single('scanned_invoice'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Scanned invoice file is required' });
      }
      const entryId = parseInt(req.params.entry_id);

      // Find or create billing document
      let doc = await prisma.billingDocument.findUnique({
        where: { entry_id: entryId },
      });

      if (!doc) {
        // Auto-create if gate entry exists
        const entry = await prisma.gateEntry.findUnique({ where: { entry_id: entryId } });
        if (!entry) return res.status(404).json({ success: false, message: 'Gate entry not found' });
        doc = await prisma.billingDocument.create({
          data: { entry_id: entryId, status: 'pending' },
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      const updated = await prisma.billingDocument.update({
        where: { doc_id: doc.doc_id },
        data: {
          scanned_invoice_url: fileUrl,
          uploaded_by: req.user.user_id,
          uploaded_at: new Date(),
          status: 'uploaded',
        },
        include: FULL_INCLUDE,
      });

      return res.json({ success: true, message: 'Invoice uploaded', data: updated });
    } catch (err) {
      console.error('[BILLING UPLOAD]', err.message, err.stack);
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── POST /api/billing/:doc_id/admin-sign ─────────────────────
router.post('/:doc_id/admin-sign', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const doc = await prisma.billingDocument.findUnique({
      where: { doc_id: parseInt(req.params.doc_id) },
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });
    if (!doc.scanned_invoice_url) {
      return res.status(400).json({ success: false, message: 'Upload the scanned invoice before signing' });
    }

    // Determine new status
    const bothSigned = doc.watchman_confirmed === true;
    const newStatus = bothSigned ? 'ready_for_accountant' : 'admin_signed';

    const updated = await prisma.billingDocument.update({
      where: { doc_id: doc.doc_id },
      data: {
        admin_signed: true,
        admin_signed_by: req.user.user_id,
        admin_signed_at: new Date(),
        status: newStatus,
      },
      include: FULL_INCLUDE,
    });

    // Update PR status
    try {
      const entry = await prisma.gateEntry.findUnique({
        where: { entry_id: doc.entry_id },
        include: { wo: true },
      });
      if (entry?.wo?.request_id) {
        await prisma.purchaseRequest.update({
          where: { request_id: entry.wo.request_id },
          data: { status: 'documents_uploaded' },
        });
      }
    } catch (e) {
      console.warn('[BILLING] PR status update failed:', e.message);
    }

    // Notify accountant if both signed
    if (bothSigned) {
      try {
        const accountants = await prisma.user.findMany({
          where: { role: { role_name: 'Accountant' }, is_active: true },
        });
        for (const acc of accountants) {
          await sendBillReadyEmail({
            to: acc.email,
            accountantName: acc.name,
            entryNumber: updated.entry?.entry_number || 'N/A',
            vendorName: updated.entry?.wo?.vendor?.vendor_name || 'Unknown',
          });
        }
      } catch (e) {
        console.warn('[BILLING] Accountant notification failed:', e.message);
      }
    }

    return res.json({
      success: true,
      message: bothSigned ? 'Document ready for accountant review' : 'Admin sign-off recorded',
      data: updated,
    });
  } catch (err) {
    console.error('[BILLING ADMIN SIGN]', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/billing/:doc_id/watchman-confirm ───────────────
router.post('/:doc_id/watchman-confirm', requireAuth, requireRole('Watchman', 'Admin'), async (req, res) => {
  try {
    const doc = await prisma.billingDocument.findUnique({
      where: { doc_id: parseInt(req.params.doc_id) },
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    const bothSigned = doc.admin_signed === true;
    const newStatus = bothSigned ? 'ready_for_accountant' : 'watchman_confirmed';

    const updated = await prisma.billingDocument.update({
      where: { doc_id: doc.doc_id },
      data: {
        watchman_confirmed: true,
        watchman_confirmed_by: req.user.user_id,
        watchman_confirmed_at: new Date(),
        status: newStatus,
      },
      include: FULL_INCLUDE,
    });

    // Update PR status to ready_for_accountant via WO
    if (bothSigned) {
      try {
        const entry = await prisma.gateEntry.findUnique({
          where: { entry_id: doc.entry_id },
          include: { wo: true },
        });
        if (entry?.wo?.request_id) {
          await prisma.purchaseRequest.update({
            where: { request_id: entry.wo.request_id },
            data: { status: 'ready_for_accountant' },
          });
        }
      } catch (e) {
        console.warn('[BILLING] PR status update failed:', e.message);
      }

      try {
        const accountants = await prisma.user.findMany({
          where: { role: { role_name: 'Accountant' }, is_active: true },
        });
        for (const acc of accountants) {
          await sendBillReadyEmail({
            to: acc.email,
            accountantName: acc.name,
            entryNumber: updated.entry?.entry_number || 'N/A',
            vendorName: updated.entry?.wo?.vendor?.vendor_name || 'Unknown',
          });
        }
      } catch (e) {
        console.warn('[BILLING] Notification failed:', e.message);
      }
    }

    return res.json({
      success: true,
      message: bothSigned ? 'Document ready for accountant' : 'Security confirmation recorded',
      data: updated,
    });
  } catch (err) {
    console.error('[BILLING WATCHMAN CONFIRM]', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /api/billing/:doc_id/accountant-verify ──────────────
router.post('/:doc_id/accountant-verify', requireAuth, requireRole('Accountant'), async (req, res) => {
  try {
    const { accountant_remarks } = req.body;
    const doc = await prisma.billingDocument.findUnique({
      where: { doc_id: parseInt(req.params.doc_id) },
      include: FULL_INCLUDE,
    });
    if (!doc) return res.status(404).json({ success: false, message: 'Document not found' });

    // Validate ALL 6 conditions
    const checks = [
      [!doc.entry?.wo?.submission?.proforma_file_url, 'Proforma Invoice not uploaded by vendor'],
      [!doc.entry?.wo?.tax_invoice_url, 'Tax Invoice not uploaded by vendor'],
      [!doc.scanned_invoice_url, 'Scanned physical invoice not uploaded'],
      [!doc.admin_signed, 'Admin has not signed off yet'],
      [!doc.watchman_confirmed, 'Security officer has not confirmed yet'],
      [doc.status !== 'ready_for_accountant', `Document status is '${doc.status}' — must be 'ready_for_accountant'`],
    ];

    for (const [failed, message] of checks) {
      if (failed) return res.status(400).json({ success: false, message });
    }

    const updated = await prisma.billingDocument.update({
      where: { doc_id: doc.doc_id },
      data: {
        accountant_verified: true,
        accountant_verified_by: req.user.user_id,
        accountant_verified_at: new Date(),
        accountant_remarks: accountant_remarks || null,
        bill_released: true,
        bill_released_at: new Date(),
        status: 'released',
      },
      include: FULL_INCLUDE,
    });

    // Update PR to final status
    try {
      const requestId = doc.entry?.wo?.request_id || doc.entry?.wo?.submission?.request_id;
      if (requestId) {
        await prisma.purchaseRequest.update({
          where: { request_id: requestId },
          data: { status: 'bill_released' },
        });
      }
    } catch (e) {
      console.warn('[BILLING] PR final update failed:', e.message);
    }

    return res.json({
      success: true,
      message: 'Bill released for payment successfully',
      data: updated,
    });
  } catch (err) {
    console.error('[BILLING ACCOUNTANT VERIFY]', err.message, err.stack);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

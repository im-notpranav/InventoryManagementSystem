const express = require('express');
const bcrypt = require('bcrypt');
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { sendWelcomeEmail } = require('../../utils/mailer');

const router = express.Router();

// GET all vendors
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const vendors = await prisma.vendor.findMany({
      include: { user: { select: { email: true, is_active: true, name: true } } },
      orderBy: { created_at: 'desc' }
    });
    return ok(res, vendors);
  } catch (err) { next(err); }
});

// GET single vendor
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { vendor_id: parseInt(req.params.id) },
      include: {
        user: { select: { email: true, is_active: true, name: true } },
        quote_submissions: { include: { request: { include: { product: true } } } },
        work_orders: true,
      }
    });
    if (!vendor) return fail(res, 'Vendor not found', 404);
    return ok(res, vendor);
  } catch (err) { next(err); }
});

// POST — Admin creates a new vendor WITH a linked User account
router.post('/', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { vendor_name, contact_person, email, phone, address } = req.body;
    if (!vendor_name || !email) return fail(res, 'Vendor name and email are required');

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return fail(res, 'A user with this email already exists');

    // Find the Vendor role
    const vendorRole = await prisma.role.findUnique({ where: { role_name: 'Vendor' } });
    if (!vendorRole) return fail(res, 'Vendor role not found in system', 500);

    // Hash default password
    const hashedPassword = await bcrypt.hash('vendor123', 12);

    // Create User and Vendor in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create User account
      const user = await tx.user.create({
        data: {
          name: contact_person || vendor_name,
          email,
          password: hashedPassword,
          role_id: vendorRole.role_id,
          is_active: true,
        }
      });

      // 2. Create Vendor record linked to User
      const vendor = await tx.vendor.create({
        data: {
          user_id: user.user_id,
          vendor_name,
          company_name: vendor_name,
          email,
          phone: phone || null,
          address: address || null,
          status: 'active',
        }
      });

      return { user, vendor };
    });

    try {
      await sendWelcomeEmail({
        to: email,
        name: contact_person || vendor_name,
        role: 'Vendor',
        password: 'vendor123',
      });
    } catch (mailErr) {
      console.error('[VENDORS] Welcome email failed:', mailErr.message);
    }

    return ok(res, {
      vendor: result.vendor,
      message: `Vendor account created successfully.\nLogin email: ${email}\nDefault password: vendor123\nPlease share these credentials with the vendor.`
    }, 'Vendor created');

  } catch (err) { next(err); }
});

// PUT — Update vendor
router.put('/:id', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { vendor_name, company_name, phone, address, status } = req.body;
    const vendor = await prisma.vendor.update({
      where: { vendor_id: parseInt(req.params.id) },
      data: {
        ...(vendor_name && { vendor_name }),
        ...(company_name && { company_name }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(status && { status }),
      }
    });
    return ok(res, vendor, 'Vendor updated');
  } catch (err) { next(err); }
});

// PUT — Toggle blacklist
router.put('/:id/toggle-status', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { vendor_id: parseInt(req.params.id) } });
    if (!vendor) return fail(res, 'Vendor not found', 404);

    const updated = await prisma.vendor.update({
      where: { vendor_id: parseInt(req.params.id) },
      data: {
        is_blacklisted: !vendor.is_blacklisted,
        status: vendor.is_blacklisted ? 'active' : 'blacklisted',
      }
    });

    // Also toggle user account
    if (vendor.user_id) {
      await prisma.user.update({
        where: { user_id: vendor.user_id },
        data: { is_active: !vendor.is_blacklisted }
      });
    }

    return ok(res, updated, vendor.is_blacklisted ? 'Vendor activated' : 'Vendor blacklisted');
  } catch (err) { next(err); }
});

module.exports = router;

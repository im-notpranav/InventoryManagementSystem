require('dotenv').config();
const express = require('express');
const bcrypt = require('../../utils/password'); // lazy-loads bcrypt
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../../config/env');
const { ok, fail } = require('../../utils/response');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { sendMail } = require('../../utils/mailer');

const router = express.Router();
const rateLimit = require('express-rate-limit');

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('[SECURITY] JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return fail(res, 'Email and password are required');

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true, vendor: true }
    });

    if (!user || !user.is_active)
      return fail(res, 'Invalid credentials or inactive account', 401);

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return fail(res, 'Invalid credentials', 401);

    const tokenPayload = {
      user_id: user.user_id,
      email: user.email,
      name: user.name,
      role: user.role.role_name,
      role_id: user.role_id,
      department: user.department,
      vendor_id: user.vendor?.vendor_id || null,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Audit log
    try {
      await prisma.auditLog.create({
        data: {
          user_id: user.user_id,
          table_name: 'Auth',
          action: 'LOGIN',
          new_value: { email, role: user.role.role_name },
        }
      });
    } catch (auditErr) {
      console.error('[AUDIT LOG ERROR]', auditErr.message);
    }

    return ok(res, {
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role.role_name,
        role_id: user.role_id,
        department: user.department,
        vendor_id: user.vendor?.vendor_id || null,
      }
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      include: { role: true, vendor: true }
    });
    if (!user) return fail(res, 'User not found', 404);

    return ok(res, {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: user.role.role_name,
      role_id: user.role_id,
      department: user.department,
      vendor_id: user.vendor?.vendor_id || null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/test-email', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
    if (!user) return fail(res, 'User not found', 404);
    const html = '<p style="font-family:Arial">This is a test email from <strong>InventBot</strong>. If you received this, SMTP is working.</p>';
    const result = await sendMail(user.email, 'InventBot — SMTP test', html);
    if (result.success === false) {
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to send email',
        result,
      });
    }
    return res.json({
      success: true,
      message: result.stubbed
        ? 'SMTP is not configured. Email delivery was stubbed.'
        : 'Test email sent successfully.',
      result: {
        ...result,
        to: user.email,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.put('/change-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!new_password || String(new_password).length < 8) {
      return fail(res, 'Password must be at least 8 characters', 400);
    }
    if (current_password === new_password) {
      return fail(res, 'New password must be different from current password', 400);
    }

    const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
    if (!user) return fail(res, 'User not found', 404);

    const isMatch = await bcrypt.compare(String(current_password), user.password);
    if (!isMatch) return fail(res, 'Invalid current password', 401);

    const hash = await bcrypt.hash(String(new_password), 12);
    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { password: hash }
    });

    return ok(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
});

// ── Vendor invite (RFQ sent to an unregistered email) ────────
// The invite link gives instant access: set name + password, then quote.
async function findInvite(token) {
  if (!/^[a-f0-9]{64}$/.test(String(token || ''))) return null;
  const vendor = await prisma.vendor.findUnique({ where: { invite_token: token } });
  if (!vendor || vendor.user_id) return null;
  if (vendor.invite_expires_at && vendor.invite_expires_at < new Date()) return null;
  return vendor;
}

router.get('/vendor-invite/:token', authLimiter, async (req, res, next) => {
  try {
    const vendor = await findInvite(req.params.token);
    if (!vendor) return fail(res, 'This invite link is invalid or has expired', 404);
    const rfqs = await prisma.vendorRFQ.count({ where: { vendor_id: vendor.vendor_id } });
    return ok(res, { email: vendor.email, vendor_name: vendor.vendor_name, open_rfqs: rfqs });
  } catch (err) { next(err); }
});

router.post('/vendor-invite/:token', authLimiter, async (req, res, next) => {
  try {
    const vendor = await findInvite(req.params.token);
    if (!vendor) return fail(res, 'This invite link is invalid or has expired', 404);

    const { name, company_name, phone, password } = req.body;
    if (!String(name || '').trim()) return fail(res, 'Contact name is required', 400);
    if (!String(company_name || '').trim()) return fail(res, 'Company name is required', 400);
    if (!password || String(password).length < 8) return fail(res, 'Password must be at least 8 characters', 400);
    if (await prisma.user.findUnique({ where: { email: vendor.email } })) {
      return fail(res, 'An account with this email already exists. Please log in.', 400);
    }
    const vendorRole = await prisma.role.findUnique({ where: { role_name: 'Vendor' } });
    if (!vendorRole) return fail(res, 'Vendor role not configured', 500);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          role_id: vendorRole.role_id,
          name: String(name).trim(),
          email: vendor.email,
          password: await bcrypt.hash(String(password), 12),
          phone: phone ? String(phone).trim() : null,
        },
      });
      await tx.vendor.update({
        where: { vendor_id: vendor.vendor_id },
        data: {
          user_id: created.user_id,
          vendor_name: String(company_name).trim(),
          company_name: String(company_name).trim(),
          phone: phone ? String(phone).trim() : vendor.phone,
          status: 'active',
          invite_token: null,
          invite_expires_at: null,
        },
      });
      return created;
    });

    const profile = {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      role: 'Vendor',
      role_id: user.role_id,
      department: null,
      vendor_id: vendor.vendor_id,
    };
    const token = jwt.sign(profile, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return ok(res, { token, user: profile }, 'Account ready');
  } catch (err) { next(err); }
});

module.exports = router;

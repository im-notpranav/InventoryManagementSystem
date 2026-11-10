const express = require('express');
const bcrypt = require('../../utils/password'); // lazy-loads bcrypt
const prisma = require('../../config/db');
const { requireAuth, requireRole } = require('../../middleware/auth.middleware');
const { ok, fail } = require('../../utils/response');
const { sendWelcomeEmail, sendPasswordChangedEmail } = require('../../utils/mailer');
const {
  DEPARTMENT_NAMES, DEFAULT_DEPARTMENT, DEPARTMENT_ROLES, normalizeDepartment, isSuperAdmin,
} = require('../../utils/departments');

const router = express.Router();

// ── Department rules ─────────────────────────────────────────
// Super admin (Admin with no department): every user, any role, any department.
// HOD (Admin with a department): sees users of their department; can create and manage
// only faculty (Department User) of that department.
const FACULTY = 'Department User';

/** Department to store for a user of `roleName`, or { error }. */
function resolveDepartment(actor, roleName, requested) {
  if (!DEPARTMENT_ROLES.includes(roleName)) return { department: null }; // college-wide roles
  if (!isSuperAdmin(actor)) return { department: actor.department };
  if (roleName === 'Admin' && requested === 'ALL') return { department: null }; // another super admin
  if (requested == null || requested === '') return { department: DEFAULT_DEPARTMENT };
  const department = normalizeDepartment(requested);
  if (!department) return { error: `Unknown department. Use one of: ${DEPARTMENT_NAMES.join(', ')}` };
  return { department };
}

/** Middleware for /:id routes: load the target user and check the actor may manage them. */
async function manageable(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'Invalid user id', 400);
    const target = await prisma.user.findUnique({ where: { user_id: id }, include: { role: true } });
    if (!target) return fail(res, 'User not found', 404);
    if (!isSuperAdmin(req.user)) {
      const own = target.department === req.user.department && target.role?.role_name === FACULTY;
      if (!own) return fail(res, 'You can only manage faculty of your own department', 403);
    }
    req.target = target;
    return next();
  } catch (err) {
    return next(err);
  }
}

const sanitizeUser = (u) => {
  if (!u) return null;
  const { password: _p, role, ...rest } = u;
  return {
    ...rest,
    role_name: role?.role_name,
  };
};

router.get('/', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    let where = {};
    if (!isSuperAdmin(req.user)) where = { department: req.user.department };
    else if (req.query.department) where = { department: normalizeDepartment(req.query.department) || '__none__' };
    const users = await prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: [{ department: 'asc' }, { created_at: 'desc' }],
    });
    const data = users.map((u) => sanitizeUser({ ...u, role: u.role }));
    return ok(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role_name,
      department,
      phone,
    } = req.body;

    if (!name || !String(name).trim()) return fail(res, 'Name is required', 400);
    const emailStr = String(email).trim();
    if (!emailStr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) return fail(res, 'A valid email is required', 400);
    if (!password || String(password).length < 8) {
      return fail(res, 'Password must be at least 8 characters', 400);
    }
    if (!role_name) return fail(res, 'role_name is required', 400);
    if (!isSuperAdmin(req.user) && role_name !== FACULTY) {
      return fail(res, 'HODs can only add faculty to their own department', 403);
    }
    const dept = resolveDepartment(req.user, String(role_name), department);
    if (dept.error) return fail(res, dept.error, 400);

    const existing = await prisma.user.findUnique({ where: { email: String(email).trim() } });
    if (existing) return fail(res, 'Email is already registered', 400);

    const role = await prisma.role.findUnique({ where: { role_name: String(role_name) } });
    if (!role) return fail(res, `Role not found: ${role_name}`, 400);

    const hash = await bcrypt.hash(String(password), 12);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          password: hash,
          role_id: role.role_id,
          department: dept.department,
          phone: phone != null ? String(phone) : null,
        },
        include: { role: true },
      });

      if (role_name === 'Vendor') {
        await tx.vendor.create({
          data: {
            user_id: created.user_id,
            vendor_name: String(name).trim(),
            company_name: department != null ? String(department) : String(name).trim(),
            email: created.email,
            phone: phone != null ? String(phone) : null,
          },
        });
      }

      return created;
    });

    const full = await prisma.user.findUnique({
      where: { user_id: user.user_id },
      include: { role: true, vendor: true },
    });

    try {
      await sendWelcomeEmail({ to: full.email, name: full.name, role: full.role?.role_name || role_name, password });
    } catch (mailErr) {
      console.error('[USERS] Welcome email failed:', mailErr.message);
    }

    return ok(res, sanitizeUser({ ...full, role: full.role }), 'User created successfully');
  } catch (err) {
    next(err);
  }
});

router.post('/create-vendor', requireAuth, requireRole('Admin'), async (req, res, next) => {
  try {
    const { name, email, phone, address, company_name } = req.body;
    if (!name || !String(name).trim()) return fail(res, 'Name is required', 400);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
      return fail(res, 'A valid email is required', 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return fail(res, 'Email is already registered', 400);

    const vendorRole = await prisma.role.findUnique({ where: { role_name: 'Vendor' } });
    if (!vendorRole) return fail(res, 'Vendor role not found', 500);

    const defaultPassword = 'demo1234';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: String(name).trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role_id: vendorRole.role_id,
          is_active: true,
          phone: phone != null ? String(phone) : null,
        },
        include: { role: true },
      });

      const vendor = await tx.vendor.create({
        data: {
          user_id: user.user_id,
          vendor_name: String(name).trim(),
          company_name: company_name ? String(company_name) : String(name).trim(),
          email: normalizedEmail,
          phone: phone != null ? String(phone) : null,
          address: address != null ? String(address) : null,
          status: 'active',
        },
      });

      return { user, vendor };
    });

    try {
      await sendWelcomeEmail({
        to: normalizedEmail,
        name: String(name).trim(),
        role: 'Vendor',
        password: 'demo1234',
      });
    } catch (mailErr) {
      console.error('[USERS] Vendor welcome email failed:', mailErr.message);
    }

    return ok(res, created, 'Vendor account created successfully');
  } catch (err) {
    next(err);
  }
});

// ':id(\\d+)' so self-service routes such as /change-my-password are not caught here.
router.put('/:id(\\d+)', requireAuth, requireRole('Admin'), manageable, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'Invalid user id', 400);

    const { name, email, role_name, department, phone, is_active } = req.body;
    const data = {};

    if (name != null) data.name = String(name);
    if (email != null) {
      const em = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        return fail(res, 'Invalid email format', 400);
      }
      const clash = await prisma.user.findFirst({
        where: { email: em, NOT: { user_id: id } },
      });
      if (clash) return fail(res, 'Email already in use', 400);
      data.email = em;
    }
    if (phone !== undefined) data.phone = phone;
    if (typeof is_active === 'boolean') data.is_active = is_active;
    if (is_active === false && id === req.user.user_id) return fail(res, 'You cannot deactivate your own account', 400);

    const nextRole = role_name != null ? String(role_name) : req.target.role?.role_name;
    if (!isSuperAdmin(req.user) && nextRole !== FACULTY) {
      return fail(res, 'HODs can only manage faculty of their own department', 403);
    }
    if (role_name != null) {
      const role = await prisma.role.findUnique({ where: { role_name: nextRole } });
      if (!role) return fail(res, `Role not found: ${role_name}`, 400);
      data.role_id = role.role_id;
    }
    // Recompute the department when the role or department changes.
    if (department !== undefined || role_name != null) {
      const requested = department !== undefined ? department : (req.target.department ?? (nextRole === 'Admin' ? 'ALL' : undefined));
      const dept = resolveDepartment(req.user, nextRole, requested);
      if (dept.error) return fail(res, dept.error, 400);
      if (id === req.user.user_id && isSuperAdmin(req.user) && (dept.department || nextRole !== 'Admin')) {
        return fail(res, 'You cannot remove your own college-wide access', 400);
      }
      data.department = dept.department;
    }

    const updated = await prisma.user.update({
      where: { user_id: id },
      data,
      include: { role: true, vendor: true },
    });

    return ok(res, sanitizeUser({ ...updated, role: updated.role }), 'User updated');
  } catch (err) {
    if (err.code === 'P2025') return fail(res, 'User not found', 404);
    next(err);
  }
});

router.put('/:id(\\d+)/reset-password', requireAuth, requireRole('Admin'), manageable, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { new_password: newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 8) {
      return fail(res, 'new_password is required (min 8 characters)', 400);
    }
    const hash = await bcrypt.hash(String(newPassword), 12);
    await prisma.user.update({
      where: { user_id: id },
      data: { password: hash },
    });
    return ok(res, null, 'Password reset successfully');
  } catch (err) {
    if (err.code === 'P2025') return fail(res, 'User not found', 404);
    next(err);
  }
});

router.delete('/:id(\\d+)', requireAuth, requireRole('Admin'), manageable, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === req.user.user_id) {
      return fail(res, 'You cannot deactivate your own account', 400);
    }
    await prisma.user.update({
      where: { user_id: id },
      data: { is_active: false },
    });
    return ok(res, null, 'User deactivated');
  } catch (err) {
    if (err.code === 'P2025') return fail(res, 'User not found', 404);
    next(err);
  }
});

// PUT — change own password (any authenticated user)
router.put('/change-my-password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password) return fail(res, 'Current password is required', 400);
    if (!new_password || String(new_password).length < 8) {
      return fail(res, 'New password must be at least 8 characters', 400);
    }

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
    });
    if (!user) return fail(res, 'User not found', 404);

    const valid = await bcrypt.compare(String(current_password), user.password);
    if (!valid) return fail(res, 'Current password is incorrect', 400);

    const hash = await bcrypt.hash(String(new_password), 12);
    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { password: hash },
    });

    try {
      await sendPasswordChangedEmail({ to: user.email, name: user.name });
    } catch (mailErr) {
      console.error('[USERS] Password changed email failed:', mailErr.message);
    }

    return ok(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
});

// PUT — change own email (any authenticated user)
router.put('/me/change-email', requireAuth, async (req, res, next) => {
  try {
    const { new_email, current_password } = req.body;
    if (!current_password) return fail(res, 'Current password is required', 400);
    if (!new_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(new_email).trim())) {
      return fail(res, 'A valid new email is required', 400);
    }

    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
    });
    if (!user) return fail(res, 'User not found', 404);

    const valid = await bcrypt.compare(String(current_password), user.password);
    if (!valid) return fail(res, 'Current password is incorrect', 400);

    const normalizedEmail = String(new_email).trim().toLowerCase();
    if (normalizedEmail === user.email) {
      return fail(res, 'New email is the same as current email', 400);
    }

    const clash = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (clash) return fail(res, 'Email is already in use by another account', 400);

    await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: { email: normalizedEmail },
    });

    return ok(res, { email: normalizedEmail }, 'Email changed successfully');
  } catch (err) {
    next(err);
  }
});

// PUT — admin changes a user's password by ID
router.put('/:id(\\d+)/change-password', requireAuth, requireRole('Admin'), manageable, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'Invalid user id', 400);

    const { new_password } = req.body;
    if (!new_password || String(new_password).length < 8) {
      return fail(res, 'new_password is required (min 8 characters)', 400);
    }

    const target = await prisma.user.findUnique({ where: { user_id: id } });
    if (!target) return fail(res, 'User not found', 404);

    const hash = await bcrypt.hash(String(new_password), 12);
    await prisma.user.update({
      where: { user_id: id },
      data: { password: hash },
    });

    try {
      await sendPasswordChangedEmail({ to: target.email, name: target.name });
    } catch (mailErr) {
      console.error('[USERS] Password changed email failed:', mailErr.message);
    }

    return ok(res, null, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
});

// PUT — admin changes a user's email by ID
router.put('/:id(\\d+)/change-email', requireAuth, requireRole('Admin'), manageable, async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return fail(res, 'Invalid user id', 400);

    const { new_email } = req.body;
    if (!new_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(new_email).trim())) {
      return fail(res, 'A valid new email is required', 400);
    }

    const normalizedEmail = String(new_email).trim().toLowerCase();
    const clash = await prisma.user.findFirst({
      where: { email: normalizedEmail, NOT: { user_id: id } },
    });
    if (clash) return fail(res, 'Email is already in use by another account', 400);

    const updated = await prisma.user.update({
      where: { user_id: id },
      data: { email: normalizedEmail },
      include: { role: true },
    });

    return ok(res, sanitizeUser({ ...updated, role: updated.role }), 'Email changed successfully');
  } catch (err) {
    if (err.code === 'P2025') return fail(res, 'User not found', 404);
    next(err);
  }
});

module.exports = router;


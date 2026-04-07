import prisma from '../../../config/db.js';
import { sendSuccess, sendError } from '../../../utils/response.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const generateTemporaryPassword = () => crypto.randomBytes(12).toString('base64url');

export const getAll = async (req, res, next) => {
  try {
    const vendors = await prisma.vendor.findMany({ 
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          select: { id: true, email: true, name: true }
        }
      }
    });
    return sendSuccess(res, vendors);
  } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { 
        purchaseOrders: { take: 10, orderBy: { createdAt: 'desc' } },
        users: { select: { id: true, email: true, name: true } }
      },
    });
    if (!vendor) return sendError(res, 'Vendor not found.', 404);
    return sendSuccess(res, vendor);
  } catch (error) { next(error); }
};

export const create = async (req, res, next) => {
  try {
    const { name, email, phone, address, gstNumber } = req.body;
    
    if (!name || !email) {
      return sendError(res, 'Vendor name and email are required.', 400);
    }

    // Check if vendor email already exists
    const existingVendor = await prisma.vendor.findUnique({ where: { email } });
    if (existingVendor) {
      return sendError(res, 'A vendor with this email already exists.', 400);
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return sendError(res, 'A user with this email already exists.', 400);
    }

    // Get vendor role
    const vendorRole = await prisma.role.findUnique({ where: { name: 'Vendor' } });
    if (!vendorRole) {
      return sendError(res, 'Vendor role not found. Please seed roles first.', 500);
    }

    // Create a one-time temporary password for first login.
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Create vendor AND user account in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create vendor
      const vendor = await tx.vendor.create({
        data: { name, email, phone, address, gstNumber, status: 'Active' },
      });

      // 2. Create user account linked to vendor
      const user = await tx.user.create({
        data: {
          name: name,
          email: email,
          password: hashedPassword,
          department: 'Vendor',
          roleId: vendorRole.id,
          vendorId: vendor.id,
          isActive: true,
        },
      });

      return { vendor, user };
    });

    // Notify admins about new vendor
    const admins = await prisma.user.findMany({
      where: { role: { name: 'Admin' }, isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          title: 'New Vendor Added',
          message: `${name} has been added as a vendor. Credentials were generated for secure handoff.`,
          type: 'info',
          link: '/vendors',
        })),
      });
    }

    return sendSuccess(res, {
      ...result.vendor,
      userAccount: {
        email: result.user.email,
        message: 'Vendor user account created. Share initial access through a secure channel and rotate credentials on first login.',
      }
    }, 'Vendor created with login account.', 201);
  } catch (error) { 
    console.error('Create vendor error:', error);
    next(error); 
  }
};

export const update = async (req, res, next) => {
  try {
    const { name, email, phone, address, gstNumber, rating, status } = req.body;
    const vendorId = parseInt(req.params.id);

    // Get current vendor
    const currentVendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { users: true }
    });

    if (!currentVendor) {
      return sendError(res, 'Vendor not found.', 404);
    }

    // Update vendor
    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: { name, email, phone, address, gstNumber, rating, status },
    });

    // If email changed, update user account email too
    if (email && email !== currentVendor.email && currentVendor.users.length > 0) {
      await prisma.user.updateMany({
        where: { vendorId: vendorId },
        data: { email: email },
      });
    }

    // If name changed, update user account name too
    if (name && name !== currentVendor.name && currentVendor.users.length > 0) {
      await prisma.user.updateMany({
        where: { vendorId: vendorId },
        data: { name: name },
      });
    }

    return sendSuccess(res, vendor, 'Vendor updated.');
  } catch (error) { next(error); }
};

export const remove = async (req, res, next) => {
  try {
    const vendorId = parseInt(req.params.id);
    
    // Deactivate vendor
    await prisma.vendor.update({
      where: { id: vendorId },
      data: { status: 'Inactive' },
    });

    // Also deactivate vendor user accounts
    await prisma.user.updateMany({
      where: { vendorId: vendorId },
      data: { isActive: false },
    });

    return sendSuccess(res, null, 'Vendor and associated user accounts deactivated.');
  } catch (error) { next(error); }
};

// Create user account for an existing vendor
export const createUserAccount = async (req, res, next) => {
  try {
    const vendorId = parseInt(req.params.id);
    
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { users: true }
    });

    if (!vendor) {
      return sendError(res, 'Vendor not found.', 404);
    }

    // Check if vendor already has a user account
    if (vendor.users.length > 0) {
      return sendError(res, 'Vendor already has a user account.', 400);
    }

    // Get vendor role
    const vendorRole = await prisma.role.findUnique({ where: { name: 'Vendor' } });
    if (!vendorRole) {
      return sendError(res, 'Vendor role not found.', 500);
    }

    // Check if email is already used
    const existingUser = await prisma.user.findUnique({ where: { email: vendor.email } });
    if (existingUser) {
      return sendError(res, 'A user with this email already exists.', 400);
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    const user = await prisma.user.create({
      data: {
        name: vendor.name,
        email: vendor.email,
        password: hashedPassword,
        department: 'Vendor',
        roleId: vendorRole.id,
        vendorId: vendor.id,
        isActive: true,
      },
    });

    return sendSuccess(res, {
      user: { id: user.id, email: user.email, name: user.name },
    }, 'User account created for vendor.');
  } catch (error) { next(error); }
};

// Sync all vendors - create accounts for vendors without user accounts
export const syncAllVendorAccounts = async (req, res, next) => {
  try {
    // Get vendor role
    const vendorRole = await prisma.role.findUnique({ where: { name: 'Vendor' } });
    if (!vendorRole) {
      return sendError(res, 'Vendor role not found.', 500);
    }

    // Get all active vendors without user accounts
    const vendorsWithoutAccounts = await prisma.vendor.findMany({
      where: {
        status: 'Active',
        users: { none: {} }
      },
    });

    const created = [];
    const skipped = [];

    for (const vendor of vendorsWithoutAccounts) {
      // Check if email is already used
      const existingUser = await prisma.user.findUnique({ where: { email: vendor.email } });
      if (existingUser) {
        skipped.push({ vendor: vendor.name, reason: 'Email already in use' });
        continue;
      }

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await bcrypt.hash(temporaryPassword, 12);
      await prisma.user.create({
        data: {
          name: vendor.name,
          email: vendor.email,
          password: hashedPassword,
          department: 'Vendor',
          roleId: vendorRole.id,
          vendorId: vendor.id,
          isActive: true,
        },
      });

      created.push({ vendorId: vendor.id, vendorName: vendor.name, email: vendor.email });
    }

    return sendSuccess(res, {
      created,
      skipped,
      message: `Created ${created.length} accounts, skipped ${skipped.length}`,
    }, 'Vendor accounts synced.');
  } catch (error) { next(error); }
};

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../../config/db.js';
import env from '../../../config/env.js';
import { AppError } from '../../../utils/response.js';

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role.name, name: user.name },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY }
  );
};

export const register = async ({ name, email, password, department, phone }) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered.', 409);

  // Default role is "User"
  let role = await prisma.role.findUnique({ where: { name: 'User' } });
  if (!role) {
    role = await prisma.role.create({ data: { name: 'User' } });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      department,
      phone,
      roleId: role.id,
    },
    include: { role: true },
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
  };
};

export const login = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user || !user.isActive) {
    throw new AppError('Invalid email or password.', 401);
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new AppError('Invalid email or password.', 401);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken },
  });

  // Log the login
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      details: 'User logged in successfully.',
    },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role.name, department: user.department },
  };
};

export const refreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: true },
    });

    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid refresh token.', 401);
    }

    const accessToken = generateAccessToken(user);
    return { accessToken };
  } catch {
    throw new AppError('Invalid or expired refresh token.', 401);
  }
};

export const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
    omit: { password: true, refreshToken: true },
  });
  if (!user) throw new AppError('User not found.', 404);
  return { ...user, role: user.role.name };
};

import dotenv from 'dotenv';
dotenv.config();

const env = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'InventBot <noreply@inventbot.com>',
};

const MIN_SECRET_LENGTH = 32;
if (!env.JWT_ACCESS_SECRET || env.JWT_ACCESS_SECRET.length < MIN_SECRET_LENGTH) {
  throw new Error('JWT_ACCESS_SECRET must be set and at least 32 characters long.');
}
if (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < MIN_SECRET_LENGTH) {
  throw new Error('JWT_REFRESH_SECRET must be set and at least 32 characters long.');
}

export default env;

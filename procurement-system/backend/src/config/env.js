require('dotenv').config();
module.exports = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  DATABASE_URL: process.env.DATABASE_URL,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'InventBot',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
};

import { sendError } from '../utils/response.js';

export const errorMiddleware = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  if (err.isOperational) {
    return sendError(res, err.message, err.statusCode);
  }

  // Prisma errors
  if (err.code === 'P2002') {
    return sendError(res, 'A record with this value already exists.', 409);
  }
  if (err.code === 'P2025') {
    return sendError(res, 'Record not found.', 404);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token.', 401);
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    const messages = err.errors.map(e => `${e.path.join('.')}: ${e.message}`);
    return sendError(res, 'Validation failed.', 400, messages);
  }

  return sendError(res, 'Internal server error.', 500);
};

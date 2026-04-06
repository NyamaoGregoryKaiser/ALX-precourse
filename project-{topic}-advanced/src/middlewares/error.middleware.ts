```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import { ENV } from '../config';
import { Prisma } from '@prisma/client';

/**
 * Global error handling middleware.
 * It catches errors thrown from route handlers and other middlewares,
 * logs them, and sends a standardized error response to the client.
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction // eslint-disable-line @typescript-eslint/no-unused-vars
) => {
  let statusCode = 500;
  let message = 'Something went wrong on the server.';
  let data: any = {};

  // Log the error
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    errorDetails: err instanceof ApiError ? err.data : undefined, // Include custom data for ApiError
  });

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    data = err.data;
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle Prisma specific errors
    if (err.code === 'P2002') {
      // Unique constraint violation
      statusCode = 409;
      const target = (err.meta?.target as string[])?.join(', ') || 'field';
      message = `A record with this ${target} already exists.`;
    } else if (err.code === 'P2025') {
      // Record not found
      statusCode = 404;
      message = 'Record not found.';
    } else {
      statusCode = 400;
      message = `Database error: ${err.message}`;
    }
    data = { code: err.code, meta: err.meta };
  } else if (err instanceof Error && err.name === 'ValidationError') {
    // Joi validation errors
    statusCode = 400;
    message = err.message;
  } else if (err instanceof Error && err.name === 'UnauthorizedError') {
    // express-jwt errors
    statusCode = 401;
    message = 'Invalid or expired token.';
  }

  // For production, hide sensitive error details
  if (ENV.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected server error occurred.';
    data = {}; // Clear any sensitive data
  }

  res.status(statusCode).json({
    success: false,
    message,
    data: Object.keys(data).length > 0 ? data : undefined,
    // In development, include stack trace
    stack: ENV.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

/**
 * Middleware for handling 404 Not Found errors.
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new ApiError(404, `Not Found - ${req.originalUrl}`);
  next(error);
};
```
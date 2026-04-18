```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';
import config from '../config/config';
import { QueryFailedError } from 'typeorm';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

/**
 * Global error handling middleware for the API.
 * This catches all errors passed via `next(error)` and sends an appropriate response to the client.
 * It differentiates between operational errors (AppError) and programming errors,
 * providing more detailed messages for the former and generic messages for the latter in production.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const apiErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Default error properties
  let statusCode: number = 500;
  let status: string = 'error';
  let message: string = 'Something went very wrong!';
  let stack: string | undefined = err.stack; // Capture stack trace for logging

  // Handle specific error types
  if (err instanceof AppError) {
    // Operational errors (e.g., validation, not found)
    statusCode = err.statusCode;
    status = err.status;
    message = err.message;
    // For AppErrors, we can log with less severity as they are expected
    logger.warn(`Operational Error: ${err.message}`, {
      statusCode: err.statusCode,
      status: err.status,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.userId,
      originalError: err.originalError ? err.originalError.message : undefined,
      stack: err.stack, // Include stack for debugging in development/detailed logs
    });
  } else if (err instanceof QueryFailedError) {
    // Database query errors (e.g., unique constraint violation)
    statusCode = 400; // Bad Request or Conflict
    status = 'fail';
    message = 'Database operation failed.';
    if ((err as any).code === '23505') { // PostgreSQL unique_violation error code
        message = 'A resource with this unique identifier already exists.';
        statusCode = 409; // Conflict
    } else if ((err as any).code === '23503') { // PostgreSQL foreign_key_violation error code
        message = 'Referenced resource does not exist or cannot be deleted due to dependencies.';
        statusCode = 400; // Bad Request
    }
    logger.error(`Database Error: ${err.message}`, {
        path: req.originalUrl,
        method: req.method,
        userId: req.user?.userId,
        errorDetails: (err as any).detail,
        sqlState: (err as any).code,
        query: (err as any).query,
        parameters: (err as any).parameters,
        stack: err.stack,
    });
  } else if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError) {
    // JWT specific errors not caught by auth.middleware (should be rare if middleware is well-placed)
    statusCode = 401;
    status = 'fail';
    message = err.message || 'Invalid or expired token.';
    logger.warn(`JWT Error: ${message}`, {
      path: req.originalUrl,
      method: req.method,
      errorName: err.name,
      stack: err.stack,
    });
  } else {
    // Catch-all for unexpected programming errors (e.g., null reference, unhandled exceptions)
    // These errors are critical and should not expose details in production.
    logger.error(`UNEXPECTED PROGRAMMING ERROR: ${err.message}`, {
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.userId,
      errorName: err.name,
      stack: err.stack,
    });
    // In production, send a generic error message
    if (config.nodeEnv === 'production') {
      message = 'Something went wrong on our end. Please try again later.';
      stack = undefined; // Don't send stack trace in production
    }
  }

  // Send the error response
  res.status(statusCode).json({
    status: status,
    message: message,
    // Only send stack trace in development or if specifically needed for debugging
    ...(config.nodeEnv === 'development' && { stack: stack }),
  });
};
```
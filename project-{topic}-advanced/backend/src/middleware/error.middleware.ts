```typescript
import { Request, Response, NextFunction } from 'express';
import { QueryFailedError } from 'typeorm';
import { logger } from '../shared/utils/logger';
import { env } from '../config/env.config';

// Define a custom error interface
interface CustomError extends Error {
  statusCode?: number;
  data?: any;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error for debugging purposes
  logger.error('Unhandled API Error:', err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    errorData: err.data, // Custom data attached to error
  });

  let statusCode = err.statusCode || res.statusCode === 200 ? 500 : res.statusCode || 500;
  let message = err.message || 'An unexpected error occurred';
  let errors: any[] = [];

  // Handle specific error types
  if (err instanceof QueryFailedError) {
    statusCode = 400; // Bad Request for database errors (e.g., constraint violations)
    message = 'Database operation failed.';
    // For production, avoid exposing raw database error messages
    if (env.NODE_ENV === 'development') {
      message = (err as any).detail || err.message; // TypeORM's detail property often has more info
    }
  } else if (err.name === 'ValidationError') {
    // Joi validation error
    statusCode = 400;
    message = 'Validation failed.';
    errors = err.data; // Assuming Joi error data is structured this way
  } else if (err.name === 'UnauthorizedError') { // For express-jwt, if used
    statusCode = 401;
    message = 'Unauthorized';
  } else if (res.statusCode === 404 && err.message.startsWith('Not Found')) {
    statusCode = 404;
    message = err.message;
  }

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(errors.length > 0 && { errors }),
    // Only send stack trace in development
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```
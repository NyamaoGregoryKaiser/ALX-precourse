```typescript
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';
import config from '../config';
import { ZodError } from 'zod';

// Custom Error Class
export class ApiError extends Error {
  statusCode: StatusCodes;
  isOperational: boolean;

  constructor(statusCode: StatusCodes, message: string, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Error handling middleware
export const errorHandler = (
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR;
  let message: string = 'Internal Server Error';

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;
    message = `Validation Error: ${err.errors.map(e => e.message).join(', ')}`;
  } else {
    // Log unexpected errors
    logger.error(`Unhandled error: ${err.message}`, err);
    if (config.nodeEnv === 'production') {
      message = 'Something went wrong'; // Generic message for production
    } else {
      message = err.message; // More detail in development
    }
  }

  res.status(statusCode).send({
    status: 'error',
    statusCode,
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }), // Include stack in dev
  });
};

// Catch unhandled rejections
export const handleUnhandledRejection = (err: Error) => {
  logger.error('Unhandled Rejection:', err);
  // Gracefully exit or restart application
  process.exit(1);
};

// Catch uncaught exceptions
export const handleUncaughtException = (err: Error) => {
  logger.error('Uncaught Exception:', err);
  // Gracefully exit or restart application
  process.exit(1);
};
```
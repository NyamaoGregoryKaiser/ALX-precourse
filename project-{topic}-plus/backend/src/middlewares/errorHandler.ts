```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/winston';

// Custom error class for API errors
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true, stack = '') {
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

// Global error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let { statusCode, message } = err;

  // If it's not an operational error, send a generic message
  if (!(err instanceof ApiError)) {
    statusCode = err.statusCode || 500;
    message = 'Internal Server Error';
  }

  // Log the error
  logger.error(err);

  // Send the error response
  res.status(statusCode).json({
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Include stack in dev
  });
};

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: Gracefully shut down server
  // process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  // Optional: Gracefully shut down server
  // process.exit(1);
});
```
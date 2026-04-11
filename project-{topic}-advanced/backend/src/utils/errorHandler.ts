```typescript
import { Request, Response, NextFunction } from 'express';
import logger from './logger';
import { config } from '../config';

// Custom Error Class
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // For errors that we can anticipate and handle gracefully

    Error.captureStackTrace(this, this.constructor);
  }
}

// Global error handling middleware
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // If it's not an operational error, wrap it in an AppError
  if (!(error instanceof AppError)) {
    // Log the original error for debugging purposes
    logger.error('UNHANDLED_ERROR:', error);
    error = new AppError('Something went wrong!', 500);
  }

  const appError = error as AppError;

  // Send error response
  res.status(appError.statusCode || 500).json({
    status: appError.status || 'error',
    message: appError.message || 'An unexpected error occurred.',
    // In development, send stack trace for debugging
    ...(config.nodeEnv === 'development' && { stack: appError.stack }),
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);
  // Optional: close server gracefully before exiting
  process.exit(1); // Exit process with failure
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);
  process.exit(1); // Exit process with failure
});
```
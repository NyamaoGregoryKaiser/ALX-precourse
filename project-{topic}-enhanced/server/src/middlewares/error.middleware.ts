import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { ApiError } from '@/utils/ApiError';
import logger from '@/utils/logger';
import { config } from '@/config';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let { statusCode, message } = err;

  // If the error is not an operational error (e.g., from an external library), convert it to one
  if (!(err instanceof ApiError)) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal Server Error'; // Mask detailed error in production
    if (config.env === 'development') {
      message = err.message || message; // Show actual message in dev
    }
  }

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }), // Only send stack in dev
  };

  logger.error(err); // Log the full error for debugging

  res.status(statusCode).send(response);
};

// Catch unhandled rejections
process.on('unhandledRejection', (reason: Error | PromiseLike<any>, promise: Promise<any>) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason.message || reason}`);
  // Optionally terminate the process or perform other cleanup
  // process.exit(1);
});

// Catch uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  // Gracefully shut down
  process.exit(1);
});
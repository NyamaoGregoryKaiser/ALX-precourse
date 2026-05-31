import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Centralized error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error for server-side debugging
  // For programming errors (not isOperational), log the full stack trace.
  if (!(err instanceof AppError && err.isOperational)) {
    logger.error(`Unhandled error for request ${req.requestId}:`, err);
  } else {
    logger.warn(`Operational error for request ${req.requestId}: ${err.message}`);
  }

  // Default error values
  let statusCode: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR;
  let message: string = 'Something went wrong!';
  let status: string = 'error';
  let errors: string[] | undefined;

  // Handle specific error types
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    status = err.status;
  } else if (err instanceof ZodError) {
    // Handle validation errors from Zod
    statusCode = StatusCodes.BAD_REQUEST;
    status = 'fail';
    message = 'Validation failed';
    errors = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle known Prisma errors (e.g., unique constraint violation)
    switch (err.code) {
      case 'P2002': // Unique constraint failed
        statusCode = StatusCodes.CONFLICT;
        status = 'fail';
        const target = (err.meta?.target as string[])?.join(', ') || 'record';
        message = `Duplicate field value: ${target}. Please use another value.`;
        break;
      case 'P2025': // Record to update/delete not found
        statusCode = StatusCodes.NOT_FOUND;
        status = 'fail';
        message = 'Resource not found.';
        break;
      default:
        // For other Prisma errors, treat as internal server error
        statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
        message = 'Database operation failed.';
        status = 'error';
    }
  } else if (err instanceof Error) {
    // Generic Error object
    message = err.message || getReasonPhrase(StatusCodes.INTERNAL_SERVER_ERROR);
  }

  // Send the error response to the client
  res.status(statusCode).json({
    status: status,
    message: message,
    ...(errors && { errors }), // Only include errors array if present (e.g., from Zod)
    ...(env.NODE_ENV === 'development' && { stack: err.stack }), // Include stack trace in dev
  });
};
```
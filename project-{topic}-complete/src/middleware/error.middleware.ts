import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import logger from '../utils/logger';
import { NODE_ENV } from '../config';

/**
 * Global error handling middleware for Express.
 * Catches errors passed via `next(error)` and sends a consistent JSON response.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // If headers already sent, defer to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'Something went wrong on the server.';
  let errorName = 'ServerError';

  // Handle custom AppErrors
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorName = err.name;
    logger.warn(`AppError (${statusCode}): ${message} - Path: ${req.path}`);
  } else {
    // Log unexpected errors with full stack trace
    logger.error(`Unhandled Error: ${err.message} - Path: ${req.path}`, {
      stack: err.stack,
      requestBody: req.body,
      requestParams: req.params,
      requestQuery: req.query,
    });

    // Special handling for common errors (e.g., database connection)
    // In a real app, you might check specific error codes or types.
    if (err.name === 'QueryFailedError' || err.name === 'EntityNotFoundError') {
      statusCode = 400;
      message = 'A database operation failed or an entity was not found.';
      errorName = 'DatabaseError';
    }
  }

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    name: errorName,
    message: message,
    // Include stack trace only in development environment for security
    stack: NODE_ENV === 'development' ? err.stack : undefined,
  });
};

/**
 * Middleware to catch 404 (Not Found) errors.
 * This should be placed after all routes but before the main error handler.
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new AppError(`Can't find ${req.originalUrl} on this server!`, 404, 'NotFound');
  next(error);
};
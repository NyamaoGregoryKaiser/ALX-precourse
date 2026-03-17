```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { environment } from '../config/environment';

/**
 * @file Global error handling middleware.
 *
 * This middleware catches all errors thrown by other middleware or route handlers,
 * logs them, and sends a standardized error response to the client.
 * It differentiates between operational errors (AppError) and programming errors.
 */

/**
 * Global error handling middleware for Express.
 *
 * @param {Error} err - The error object caught.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function (not used here, but required by Express).
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    return next(err); // Delegate to default Express error handler if headers already sent
  }

  let error = { ...err }; // Create a copy of the error object
  error.name = err.name;
  error.message = err.message;

  // Log the error
  if (err instanceof AppError) {
    logger.warn(`AppError (${err.statusCode}): ${err.message}`, {
      path: req.path,
      method: req.method,
      stack: environment.nodeEnv === 'development' ? err.stack : undefined
    });
  } else {
    logger.error(`Unhandled Error: ${err.message}`, {
      path: req.path,
      method: req.method,
      stack: err.stack,
      errorObject: err
    });
  }

  // Handle specific error types
  if (error.name === 'JsonWebTokenError') {
    error = new AppError('Invalid token, please log in again', 401);
  }

  if (error.name === 'TokenExpiredError') {
    error = new AppError('Token has expired, please log in again', 401);
  }

  // Set default status code and message
  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const message = error instanceof AppError ? error.message : 'Something went wrong!';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Include stack trace only in development environment for debugging
    stack: environment.nodeEnv === 'development' ? err.stack : undefined,
  });
};
```
```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Custom error handler middleware for Express.
 * Catches errors thrown by route handlers and other middleware,
 * logs them, and sends a standardized error response to the client.
 * @param err The error object
 * @param req Express Request object
 * @param res Express Response object
 * @param next Express NextFunction
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error for debugging purposes (excluding sensitive info)
  logger.error(`Error encountered: ${err.message}`, {
    method: req.method,
    path: req.path,
    stack: err.stack, // Log stack trace for server-side debugging
  });

  // Determine the status code
  // If the error has a status property, use it; otherwise, default to 500
  const statusCode = err.statusCode || 500;

  // Prepare the error response
  const errorResponse = {
    message: err.message || 'An unexpected error occurred',
    // In production, avoid sending detailed error messages or stack traces to clients
    // For development, we might include stack for easier debugging
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  // Send the error response
  res.status(statusCode).json(errorResponse);
};

// Middleware for handling 404 (Not Found) errors
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  logger.warn(`404 Not Found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: `Resource not found: ${req.originalUrl}` });
};
```
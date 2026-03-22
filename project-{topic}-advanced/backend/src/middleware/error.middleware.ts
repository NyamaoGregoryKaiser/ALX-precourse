```typescript
import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/error';
import logger from '../services/logger.service';

/**
 * Express error handling middleware.
 * @param err The error object.
 * @param req The Express request object.
 * @param res The Express response object.
 * @param next The Express next middleware function.
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err); // Delegate to default error handler if headers already sent
  }

  let statusCode = 500;
  let message = 'An unexpected error occurred.';

  // Handle custom errors
  if (err instanceof CustomError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Handle validation errors from yup or similar libraries
    statusCode = 400;
    message = err.message || 'Validation error.';
  } else if (err.name === 'QueryFailedError') {
    // TypeORM database query errors
    statusCode = 400; // Or 409 for unique constraints, 500 for server issues
    message = 'Database operation failed. Please check your input.';
    logger.error(`Database Error: ${err.message}`, { path: req.path, method: req.method, stack: err.stack });
  } else {
    // Log unexpected errors with stack trace
    logger.error(`Unhandled Error: ${err.message}`, { path: req.path, method: req.method, stack: err.stack });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message: message,
    // In production, avoid sending stack trace to client
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```

#### `backend/src/middleware/logging.middleware.ts`
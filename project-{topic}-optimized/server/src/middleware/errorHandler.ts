import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { CustomError } from '../utils/errors';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logger.error(`Error: ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: err.stack,
    isOperational: err instanceof CustomError, // Differentiate operational vs programming errors
  });

  let statusCode = 500;
  let message = 'Something went wrong on the server.';

  if (err instanceof CustomError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') { // Example for validation library errors
    statusCode = 400;
    message = 'Validation Error: ' + err.message;
  } else if (err.name === 'UnauthorizedError') { // For JWT errors
    statusCode = 401;
    message = err.message;
  } else if (err.name === 'ForbiddenError') { // For authorization issues
    statusCode = 403;
    message = err.message;
  } else if (err.name === 'EntityNotFound') { // TypeORM entity not found
    statusCode = 404;
    message = 'Resource not found.';
  } else if (err.name === 'QueryFailedError') { // Generic database query error
    statusCode = 500;
    message = 'Database operation failed.';
    // In dev, you might expose more details, but not in production
    if (process.env.NODE_ENV === 'development') {
        message += `: ${err.message}`;
    }
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    // Include stack trace only in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
```
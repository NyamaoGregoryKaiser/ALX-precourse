```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } from '../utils/appErrors';
import logger from '../utils/logger';
import { QueryFailedError } from 'typeorm';

// Centralized Error Handling Middleware
const globalErrorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  let error = { ...err }; // Create a copy of the error
  error.message = err.message;
  let statusCode = 500;

  // Log the error
  logger.error(`${req.method} ${req.originalUrl} - ${err.name}: ${err.message}`, {
    stack: err.stack,
    params: req.params,
    query: req.query,
    body: req.body,
    user: (req as any).user ? (req as any).user.id : 'N/A'
  });

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    error = err;
  } else if (err.name === 'CastError') {
    // Mongoose/TypeORM invalid ID
    statusCode = 400;
    error = new BadRequestError(`Invalid ${err.message.split(' ')[3].replace(/\"/g, '')} format`);
  } else if (err.name === 'ValidationError') {
    // Example for Joi/Zod validation errors
    statusCode = 400;
    const messages = Object.values((err as any).errors).map((val: any) => val.message);
    error = new BadRequestError(`Validation failed: ${messages.join('. ')}`);
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    error = new UnauthorizedError('Invalid token, please log in again');
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    error = new UnauthorizedError('Token expired, please log in again');
  } else if ((err as any).code === '23505') { // PostgreSQL unique constraint violation error code
    statusCode = 409;
    const detail = (err as QueryFailedError).detail;
    const match = detail ? detail.match(/Key \((.+)\)=\((.+)\) already exists./) : null;
    let message = 'Duplicate field value entered';
    if (match && match[1] && match[2]) {
      message = `Duplicate value for ${match[1]}: ${match[2]}. Please use another value.`;
    }
    error = new ConflictError(message);
  } else if (err.name === 'QueryFailedError') { // Catch all TypeORM QueryFailedError
    statusCode = 400;
    error = new BadRequestError(`Database query failed: ${(err as QueryFailedError).message}`);
  }

  // Send the error response
  res.status(statusCode).json({
    status: 'error',
    message: error.message || 'Something went wrong on the server.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Only show stack in development
  });
};

export default globalErrorHandler;
```
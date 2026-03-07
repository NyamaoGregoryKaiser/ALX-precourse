```typescript
import { Request, Response, NextFunction } from 'express';
import { EntityNotFoundError, QueryFailedError } from 'typeorm';
import { JsonWebTokenError } from 'jsonwebtoken';
import logger from '../utils/logger';
import { ValidationError } from '../types';

interface CustomError extends Error {
  statusCode?: number;
  data?: any;
  errors?: ValidationError[];
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error(
    `Error: ${err.message} | Status: ${err.statusCode || 500} | Path: ${req.path}`,
    err
  );

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong!';
  let errors: ValidationError[] | undefined = err.errors;

  if (err instanceof EntityNotFoundError) {
    statusCode = 404;
    message = 'Resource not found';
  } else if (err instanceof QueryFailedError) {
    statusCode = 400;
    // Log the actual SQL error for debugging, but provide a generic message to the client
    logger.error(`Database Query Failed: ${err.message}`, err.stack);
    message = 'Database operation failed. Please check your input.';
    // Example for unique constraint violation:
    if ((err as any).code === '23505') { // PostgreSQL unique violation error code
      const detail = (err as any).detail || '';
      if (detail.includes('already exists')) {
        message = detail; // Or a more user-friendly message
      }
    }
  } else if (err instanceof JsonWebTokenError) {
    statusCode = 401;
    message = 'Invalid token. Please log in again.';
  } else if (err.name === 'UnauthorizedError') { // For express-jwt library errors
    statusCode = 401;
    message = 'Unauthorized. Please provide a valid token.';
  } else if (err.name === 'ForbiddenError') { // Custom forbidden error
    statusCode = 403;
    message = 'Forbidden. You do not have permission to access this resource.';
  } else if (err.name === 'BadRequestError') { // Custom bad request error
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'NotFoundError') { // Custom not found error
    statusCode = 404;
    message = err.message;
  }


  // Send a more detailed error in development, less in production
  const errorResponse: any = {
    status: 'error',
    message,
  };

  if (errors && errors.length > 0) {
    errorResponse.errors = errors;
  }

  // Include stack trace in dev/test for debugging
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    if (err.data) {
      errorResponse.data = err.data;
    }
  }

  res.status(statusCode).json(errorResponse);
};

// Custom Error Classes for consistent handling
export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  errors?: ValidationError[];
  constructor(message = 'Bad Request', errors?: ValidationError[]) {
    super(message);
    this.name = 'BadRequestError';
    this.errors = errors;
  }
}
```
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import Joi from 'joi';

// Custom error classes for specific scenarios
export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string = "Forbidden: Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class BadRequestError extends Error {
  statusCode = 400;
  constructor(message: string = "Bad Request") {
    super(message);
    this.name = "BadRequestError";
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string = "Conflict") {
    super(message);
    this.name = "ConflictError";
  }
}

// Global error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'An unexpected error occurred';
  let errors: any[] | undefined;

  // Joi validation error
  if (Joi.isError(err)) {
    statusCode = 400;
    message = 'Validation failed';
    errors = err.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/['"]/g, '')
    }));
  } else if (err.code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409; // Conflict
    message = `Duplicate entry: ${err.detail}`;
  } else if (err instanceof NotFoundError || err instanceof UnauthorizedError || err instanceof ForbiddenError || err instanceof BadRequestError || err instanceof ConflictError) {
    // Custom errors already have correct statusCode and message
  } else {
    // Catch-all for unexpected errors
    logger.error(`Unhandled error: ${message}`, {
      stack: err.stack,
      method: req.method,
      url: req.originalUrl,
      body: req.body,
      user: req.user ? { id: req.user.id, role: req.user.role } : 'anonymous',
      errorName: err.name,
    });
    // In production, avoid leaking sensitive error details
    if (process.env.NODE_ENV === 'production' && statusCode === 500) {
      message = 'An internal server error occurred';
    }
  }

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(errors && { errors }) // Only include errors array if present
  });
};
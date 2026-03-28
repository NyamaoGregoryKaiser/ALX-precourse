import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';
import { CustomError } from '../utils/errors.util';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error in ${req.method} ${req.originalUrl}: ${err.message}`, err);

  // Default to 500 Internal Server Error
  let statusCode = 500;
  let message = 'Internal Server Error';

  if (err instanceof CustomError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Joi validation errors
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Not authorized, token failed';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Not authorized, token expired';
  } else if (err.name === 'PrismaClientKnownRequestError') {
    // Handle Prisma specific errors (e.g., unique constraint violation, record not found)
    if ((err as any).code === 'P2002') {
      statusCode = 409; // Conflict
      message = `Duplicate field value: ${(err as any).meta?.target || 'unknown field'}`;
    } else if ((err as any).code === 'P2025') {
      statusCode = 404; // Not Found
      message = `Record not found: ${(err as any).meta?.cause || err.message}`;
    }
    // Add more Prisma error codes as needed
  }

  // If in development mode, include stack trace
  const errorResponse = {
    message,
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  };

  res.status(statusCode).json(errorResponse);
};

import { config } from '../config/env.config';
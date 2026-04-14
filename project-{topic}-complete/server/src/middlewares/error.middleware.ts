import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class CustomError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, CustomError.prototype); // Fix for 'instanceof'
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err); // Delegate to default Express error handler if headers already sent
  }

  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  const message = err instanceof CustomError ? err.message : 'An unexpected error occurred.';

  logger.error(`[${statusCode}] ${req.method} ${req.originalUrl} - ${message}`, err);

  res.status(statusCode).json({
    status: 'error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Only expose stack in dev
  });
};
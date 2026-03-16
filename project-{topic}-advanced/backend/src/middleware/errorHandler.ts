import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class CustomError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err instanceof CustomError ? err.statusCode : 500;
  const message = err instanceof CustomError ? err.message : 'An unexpected error occurred.';

  logger.error(`Error: ${statusCode} - ${message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });

  res.status(statusCode).json({
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
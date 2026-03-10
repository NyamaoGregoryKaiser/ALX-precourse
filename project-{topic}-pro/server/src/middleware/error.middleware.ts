import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../utils/error';
import { Logger } from '../utils/logger';

export const errorMiddleware = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof CustomError) {
    Logger.warn(`Custom Error: ${err.statusCode} - ${err.message}`);
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  Logger.error(`Unhandled Error: ${err.message}`, err.stack);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
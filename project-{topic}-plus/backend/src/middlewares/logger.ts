import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info(`Request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    body: req.body, // Log request body (be careful with sensitive data)
    user: req.user ? { id: req.user.id, role: req.user.role } : 'anonymous'
  });

  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const responseTimeInMs = (diff[0] * 1e9 + diff[1]) / 1e6;

    logger.info(`Response: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${responseTimeInMs.toFixed(2)}ms`, {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: responseTimeInMs.toFixed(2),
      user: req.user ? { id: req.user.id, role: req.user.role } : 'anonymous'
    });
  });

  next();
};
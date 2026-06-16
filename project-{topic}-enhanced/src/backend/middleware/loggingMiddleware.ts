import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    // Log request details
    logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        body: req.body, // Be careful with logging sensitive data
        headers: req.headers // Be careful with logging sensitive data
    });

    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000; // duration in ms

        // Log response details
        logger.info(`Outgoing Response: ${req.method} ${req.originalUrl} - ${res.statusCode}`, {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration.toFixed(2)}ms`,
            responseSize: res.get('Content-Length') || 'N/A'
        });
    });

    next();
};
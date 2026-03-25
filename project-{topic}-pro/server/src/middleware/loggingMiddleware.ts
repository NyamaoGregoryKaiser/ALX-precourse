import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startHrTime = process.hrtime();

    // Log request details
    logger.info(`HTTP Request: ${req.method} ${req.originalUrl}`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        body: req.body, // Be careful with sensitive data here
        userId: req.user?.id || 'anonymous',
    });

    res.on('finish', () => {
        const elapsedHrTime = process.hrtime(startHrTime);
        const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;

        // Log response details
        logger.info(`HTTP Response: ${req.method} ${req.originalUrl} - ${res.statusCode} ${res.statusMessage} (${elapsedTimeInMs.toFixed(2)}ms)`, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            responseTimeMs: parseFloat(elapsedTimeInMs.toFixed(2)),
            userId: req.user?.id || 'anonymous',
        });
    });

    next();
};

export default loggingMiddleware;
```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = (end - start) / BigInt(1_000_000); // duration in milliseconds
        logger.info(`[${req.method}] ${req.originalUrl} - ${res.statusCode} - ${duration}ms`, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: Number(duration),
            ip: req.ip,
            userAgent: req.headers['user-agent'],
            userId: (req as any).userId // if authMiddleware has run
        });
    });

    next();
};
```
```typescript
import rateLimit from 'express-rate-limit';
import logger from '../utils/logger';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requests

export const apiRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again after some time.',
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip} on URL: ${req.originalUrl}`);
        res.status(429).json({
            success: false,
            message: 'Too many requests, please try again later.'
        });
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Example of a stricter limiter for auth routes
export const authRateLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS, // 1 minute
    max: 10, // 10 requests per minute per IP for auth
    message: 'Too many authentication attempts from this IP, please try again after a minute.',
    handler: (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip} on URL: ${req.originalUrl}`);
        res.status(429).json({
            success: false,
            message: 'Too many authentication attempts, please try again later.'
        });
    },
    standardHeaders: true,
    legacyHeaders: false,
});
```
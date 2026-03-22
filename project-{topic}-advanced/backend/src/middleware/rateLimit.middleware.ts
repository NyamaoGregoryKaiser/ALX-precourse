```typescript
import rateLimit from 'express-rate-limit';
import config from '../config';
import logger from '../services/logger.service';

/**
 * Global API rate limiter middleware.
 * Limits requests from the same IP address.
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute window
  max: config.rateLimit.max, // limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again after a minute.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. URL: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

/**
 * Stricter rate limit for authentication endpoints.
 */
export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute window
  max: Math.floor(config.rateLimit.max / 5), // e.g., 20 requests per minute
  message: 'Too many authentication attempts from this IP, please try again after a minute.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}. URL: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});
```

#### `backend/src/services/cache.service.ts`
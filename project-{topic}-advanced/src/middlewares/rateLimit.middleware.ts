```typescript
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';

/**
 * API Rate Limiting Middleware.
 * Limits repeated requests to public APIs and/or endpoints to prevent abuse.
 * Uses `express-rate-limit` library.
 *
 * Configuration:
 * - `windowMs`: The time window in milliseconds for which requests are counted.
 * - `max`: The maximum number of requests allowed within the `windowMs`.
 * - `message`: The message sent when the limit is exceeded.
 * - `standardHeaders`: Set to `true` to include `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset` headers.
 * - `legacyHeaders`: Set to `false` to disable the `X-RateLimit-*` headers (recommended).
 * - `keyGenerator`: Function to generate a unique key for each client. By default, uses `req.ip`.
 * - `handler`: Custom handler for when rate limit is exceeded.
 */
export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

/**
 * Example of a stricter rate limiter for sensitive routes (e.g., login, password reset).
 */
export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 attempts per 5 minutes per IP
  message: 'Too many authentication attempts, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});
```
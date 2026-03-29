```typescript
import { rateLimit } from 'express-rate-limit';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Global rate limiting middleware using `express-rate-limit`.
 * Protects against brute-force attacks and abuse by limiting
 * the number of requests from a single IP address within a specified time window.
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // Time window in milliseconds
  max: config.rateLimitMaxRequests,    // Max requests per windowMs per IP
  message: {
    message: 'Too many requests from this IP, please try again after a minute',
    statusCode: 429,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. Path: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
  skip: (req) => {
    // Optionally skip rate limiting for certain requests, e.g., health checks
    return req.path === '/api/health';
  }
});
```
```typescript
import rateLimit from 'express-rate-limit';
import { environment } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * @file API rate limiting middleware.
 *
 * This module configures and exports an Express rate limiting middleware
 * to protect against brute-force attacks and abuse by limiting the number
 * of requests a user can make within a specified time window.
 */

export const apiRateLimiter = rateLimit({
  windowMs: environment.rateLimitWindowMs, // e.g., 1 minute
  max: environment.rateLimitMaxRequests,   // e.g., Limit each IP to 100 requests per `windowMs`
  message: 'Too many requests from this IP, please try again after some time.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. Max requests: ${options.max}`);
    res.status(options.statusCode).send(options.message);
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available, otherwise req.ip
    return req.headers['x-forwarded-for'] as string || req.ip;
  }
});

logger.info(`Rate limiting enabled: Max ${environment.rateLimitMaxRequests} requests per ${environment.rateLimitWindowMs / 1000} seconds.`);
```
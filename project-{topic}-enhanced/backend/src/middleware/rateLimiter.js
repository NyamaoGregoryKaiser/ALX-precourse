```javascript
import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

/**
 * API rate limiter middleware.
 * Limits requests per IP address to prevent abuse.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on path: ${req.path}`);
    res.status(options.statusCode).send({
      code: options.statusCode,
      message: options.message,
    });
  },
});

/**
 * Auth rate limiter middleware.
 * More restrictive for authentication endpoints to prevent brute-force attacks.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 requests per windowMs
  message: 'Too many authentication attempts from this IP, please try again after 5 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip} on path: ${req.path}`);
    res.status(options.statusCode).send({
      code: options.statusCode,
      message: options.message,
    });
  },
});
```
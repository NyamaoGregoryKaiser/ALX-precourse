```typescript
import { rateLimit } from 'express-rate-limit';
import { TooManyRequestsError } from '../utils/appErrors';
import logger from '../utils/logger';

// Rate limiting middleware for the entire API
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown', // Generate key from IP
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${options.keyGenerator(req)} on route: ${req.originalUrl}`);
    next(new TooManyRequestsError(options.message as string));
  },
});

// Example of a stricter rate limiter for authentication routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts per IP per 15 minutes
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${options.keyGenerator(req)} on route: ${req.originalUrl}`);
    next(new TooManyRequestsError(options.message as string));
  },
});
```
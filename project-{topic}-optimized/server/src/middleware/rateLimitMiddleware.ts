import rateLimit from 'express-rate-limit';
import config from '../config';
import logger from '../utils/logger';

export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute
  max: config.rateLimit.maxRequests, // Max 100 requests per 1 minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after a minute',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. URL: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

// Optionally, specific rate limiters for different routes
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 login attempts per 15 minutes per IP
  message: {
    success: false,
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}. URL: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});
```
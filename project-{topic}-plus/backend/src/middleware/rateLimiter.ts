import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
import { StatusCodes } from 'http-status-codes';
import { logger } from '../utils/logger';

// Base rate limiter configuration
const baseRateLimiter = {
  windowMs: env.RATE_LIMIT_WINDOW_MS, // milliseconds
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: any, res: any, next: any, options: any) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on URL: ${req.originalUrl}`);
    res.status(options.statusCode).send({
      status: 'fail',
      message: options.message,
    });
  },
  message: 'Too many requests from this IP, please try again after some time.',
};

/**
 * Rate limiter for authenticated users.
 * Allows `RATE_LIMIT_MAX_REQUESTS` requests per `RATE_LIMIT_WINDOW_MS`.
 */
export const authenticatedRateLimiter = rateLimit({
  ...baseRateLimiter,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.user?.id || req.ip, // Use user ID for authenticated users, fall back to IP
});

/**
 * Rate limiter for guest users (unauthenticated routes like login/register).
 * Allows `RATE_LIMIT_GUEST_MAX_REQUESTS` requests per `RATE_LIMIT_WINDOW_MS`.
 */
export const guestRateLimiter = rateLimit({
  ...baseRateLimiter,
  max: env.RATE_LIMIT_GUEST_MAX_REQUESTS,
  keyGenerator: (req) => req.ip, // Always use IP for guests
});

/**
 * Specific rate limiter for login attempts to prevent brute-force.
 * Stricter limits for this critical endpoint.
 */
export const loginRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS / 6, // 10 seconds
  max: 5, // 5 requests per 10 seconds
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many login attempts from this IP, please try again after 1 minute.',
  handler: (req: any, res: any, next: any, options: any) => {
    logger.warn(`Login rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send({
      status: 'fail',
      message: options.message,
    });
  },
});
```
import { rateLimit } from 'express-rate-limit';
import logger from '../utils/logger';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '../config';

/**
 * Rate limiting middleware to prevent brute-force attacks and abuse.
 * Limits each IP address to a certain number of requests within a specified window.
 */
export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, // e.g., 15 * 60 * 1000 = 15 minutes
  max: RATE_LIMIT_MAX_REQUESTS,    // e.g., 100 requests per window
  message: {
    status: 'error',
    name: 'TooManyRequests',
    message: 'Too many requests from this IP, please try again after some time.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. URL: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available (for proxies), otherwise req.ip
    return req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip;
  }
});
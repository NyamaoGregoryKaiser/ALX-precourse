```typescript
import rateLimit from 'express-rate-limit';
import config from '../config/config';
import logger from '../utils/logger';
import { AppError } from '../utils/appError';

/**
 * Global rate limiting middleware.
 * Prevents abuse and Denial-of-Service attacks by limiting the number of requests
 * a user can make within a specified time window.
 */
export const rateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // Time window for requests (e.g., 60000ms = 1 minute)
  max: config.rateLimitMaxRequests, // Max requests per IP per window (e.g., 100 requests)
  message: JSON.stringify({ // Custom message for rate limit exceeded
    status: 'fail',
    message: 'Too many requests from this IP, please try again after a minute.',
  }),
  statusCode: 429, // Too Many Requests HTTP status code
  headers: true, // Send `RateLimit-*` headers to the client
  keyGenerator: (req) => {
    // Use IP address from req.ip (which is usually determined by Express/proxy settings)
    return req.ip;
  },
  handler: (req, res, next, options) => {
    // Custom handler when rate limit is exceeded
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.originalUrl}. Max requests: ${options.max}, window: ${options.windowMs / 1000}s.`);
    res.status(options.statusCode).send(options.message); // Send the configured message and status
  },
  // If you want to use Redis store for distributed rate limiting (recommended for multiple instances)
  // store: new RedisStore({
  //   client: require('ioredis').createClient({
  //     host: config.redisHost,
  //     port: config.redisPort,
  //     password: config.redisPassword,
  //   }),
  //   expiry: config.rateLimitWindowMs / 1000, // Expiry in seconds
  // }),
});
```
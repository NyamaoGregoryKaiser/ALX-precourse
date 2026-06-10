```typescript
import rateLimit from 'express-rate-limit';
import { redisClient } from '../config/redis.config';
import { env } from '../config/env.config';
import { logger } from '../shared/utils/logger';

/**
 * API Rate Limiter
 * Limits requests based on IP address.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // e.g., 1 minute
  max: env.RATE_LIMIT_MAX_REQUESTS, // e.g., limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  // Use Redis store for distributed rate limiting
  store: new (require('express-rate-limit-redis'))({
    client: redisClient,
    expiry: env.RATE_LIMIT_WINDOW_MS / 1000, // Convert ms to seconds
    prefix: 'rate-limit:',
  }),

  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on URL: ${req.originalUrl}`);
    res.status(429).json({
      message: 'Too many requests, please try again after some time.',
    });
  },
  keyGenerator: (req) => {
    // Use the client's IP address as the key for rate limiting
    // In production, ensure this correctly identifies unique clients
    // (e.g., considering X-Forwarded-For headers if behind a proxy)
    return req.ip;
  },
});

// You can create specific rate limiters for different routes if needed
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login/registration requests per 15 minutes
  message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  store: new (require('express-rate-limit-redis'))({
    client: redisClient,
    expiry: 15 * 60, // 15 minutes in seconds
    prefix: 'auth-rate-limit:',
  }),
});
```

#### Shared Utilities
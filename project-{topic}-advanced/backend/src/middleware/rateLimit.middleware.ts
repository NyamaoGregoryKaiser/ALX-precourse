```typescript
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { getRedisClient } from '../config/redis';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '../config/env';
import logger from '../utils/logger';

const redisClient = getRedisClient(); // Ensure Redis is connected before this middleware is used

export const apiRateLimiter = rateLimit({
  store: new RedisStore({
    // @ts-ignore: `redis` is of type `RedisClient` in `rate-limit-redis`,
    // but `getRedisClient()` returns `RedisClientType` from `redis` package.
    // The underlying methods are compatible for this use case.
    redis: redisClient,
    // Message will be returned in "X-RateLimit-Reset" header
    // resetBefore: RATE_LIMIT_WINDOW_MS / 1000,
  }),
  windowMs: RATE_LIMIT_WINDOW_MS, // 1 minute
  max: RATE_LIMIT_MAX_REQUESTS, // Limit each IP to 100 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again after a minute',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
});
```
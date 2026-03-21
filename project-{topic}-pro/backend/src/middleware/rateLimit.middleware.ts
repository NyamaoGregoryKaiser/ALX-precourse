```typescript
import { rateLimit } from 'express-rate-limit';
import { config } from '@config/index';
import { RedisStore } from 'express-rate-limit-redis';
import redisClient from '@config/redis';
import logger from '@config/logger';

export const apiRateLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS, // 1 minute
  max: config.RATE_LIMIT_MAX_REQUESTS, // Max requests per windowMs per IP
  message: 'Too many requests from this IP, please try again after some time.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    // @ts-ignore - The types for `express-rate-limit-redis` are a bit off.
    // However, sendCommand is the correct method for v4 of `redis`.
  }),
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. Path: ${req.path}`);
    res.status(options.statusCode).send(options.message);
  }
});
```
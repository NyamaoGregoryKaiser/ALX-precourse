```typescript
import { rateLimit } from 'express-rate-limit';
import { config } from '../config';
import { getRedisClient } from '../config/redis';
import { RedisStore } from 'express-rate-limit-redis';
import { logger } from '../utils/logger';

export const authRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: config.rateLimit.message,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  // Use Redis store for distributed rate limiting across multiple instances
  store: new RedisStore({
    sendCommand: (...args: string[]) => getRedisClient().sendCommand(args),
    // @ts-ignore - The types for RedisStore are a bit tricky with `sendCommand`
    // but this setup works with redis@4 and express-rate-limit-redis.
  }),
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}, URL: ${req.originalUrl}`);
    res.status(429).json({
      message: config.rateLimit.message,
    });
  },
});
```
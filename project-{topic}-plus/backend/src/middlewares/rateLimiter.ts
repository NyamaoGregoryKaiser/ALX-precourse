```typescript
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { redisClient } from '../config/redis';
import { config } from '../config';
import { logger } from '../config/winston';

const store = new (require('express-rate-limit-redis'))({
  client: redisClient,
  // expiry: config.rateLimitWindowMs / 1000, // in seconds
});

export const rateLimiterMiddleware = rateLimit({
  windowMs: config.rateLimitWindowMs, // e.g., 1 minute
  max: config.rateLimitMaxRequests, // e.g., 100 requests per IP per window
  message: 'Too many requests from this IP, please try again after some time.',
  store: store,
  handler: (req: Request, res: Response, next: NextFunction, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. Max requests: ${options.max}`);
    res.status(options.statusCode).send(options.message);
  },
  keyGenerator: (req: Request, res: Response) => {
    return req.ip; // Use IP address as the key
  },
  skip: (req: Request, res: Response) => {
    // Optionally skip rate limiting for certain paths or authenticated users
    // For example, if req.user is set after authentication, you might skip it
    return req.path.startsWith('/api/public');
  }
});
```
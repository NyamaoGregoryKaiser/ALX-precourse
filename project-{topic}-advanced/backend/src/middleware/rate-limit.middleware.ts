```typescript
import { rateLimit } from 'express-rate-limit';
import { env } from '../config';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 1 minute
  max: env.RATE_LIMIT_MAX_REQUESTS, // Limit each IP to X requests per `window`
  message: {
    message: 'Too many requests from this IP, please try again after a minute.',
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available, otherwise req.ip
    return req.headers['x-forwarded-for'] as string || req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${options.key} on URL: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  }
});
```
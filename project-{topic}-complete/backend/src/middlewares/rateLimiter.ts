```typescript
import rateLimit from 'express-rate-limit';
import config from '../config';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';

const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute
  max: config.rateLimit.maxRequests, // Max 100 requests per minute
  message: `Too many requests from this IP, please try again after ${
    config.rateLimit.windowMs / 1000
  } seconds.`,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send({
      code: options.statusCode,
      message: options.message,
    });
  },
});

export default authLimiter;
```
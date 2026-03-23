```typescript
import { rateLimit } from 'express-rate-limit';
import { StatusCodes } from 'http-status-codes';
import config from '../config';
import logger from '../utils/logger';

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs, // 15 minutes
  max: config.rateLimitMax, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    status: 'error',
    statusCode: StatusCodes.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP, please try again after some time.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
});
```
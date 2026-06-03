```typescript
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError, HttpCode } from '../utils/app-error';
import { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } from '../config/constants';
import { logger } from '../utils/logger';

export const apiRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: RATE_LIMIT_MAX_REQUESTS, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    return new AppError(
      'Too many requests from this IP, please try again after 15 minutes',
      HttpCode.TOO_MANY_REQUESTS
    ).serializeErrors();
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => req.ip, // Use IP address to identify client
});

export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // Limit each IP to 5 login attempts per 5 minutes
  message: (req, res) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    return new AppError(
      'Too many authentication attempts from this IP, please try again after 5 minutes',
      HttpCode.TOO_MANY_REQUESTS
    ).serializeErrors();
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```
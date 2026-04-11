```typescript
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../utils/errorHandler';

// Apply to all requests
export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: 'draft-7', // Set `RateLimit` and `RateLimit-Policy` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: new AppError('Too many requests from this IP, please try again after 15 minutes!', 429).message,
  handler: (req, res, next, options) => {
    // Custom handler to return AppError structure
    res.status(options.statusCode).json({
      status: 'fail',
      message: options.message,
    });
  }
});

// Specific rate limit for login attempts (more strict)
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per window
  message: new AppError('Too many login attempts from this IP, please try again after 15 minutes!', 429).message,
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      status: 'fail',
      message: options.message,
    });
  }
});
```
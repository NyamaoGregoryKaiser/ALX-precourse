import { rateLimit } from 'express-rate-limit';
import { AppError } from './errorHandler';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes!',
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 login attempts per 5 minutes per IP
  message: 'Too many authentication attempts from this IP, please try again after 5 minutes!',
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  },
  standardHeaders: true,
  legacyHeaders: false,
});
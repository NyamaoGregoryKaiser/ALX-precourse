import { rateLimit } from 'express-rate-limit';
import { CustomError } from '../utils/error';

// General API rate limit
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: new CustomError('Too many requests from this IP, please try again after 15 minutes', 429),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limit for authentication routes
export const authRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 login/register requests per windowMs
  message: new CustomError('Too many authentication attempts from this IP, please try again after 5 minutes', 429),
  standardHeaders: true,
  legacyHeaders: false,
});
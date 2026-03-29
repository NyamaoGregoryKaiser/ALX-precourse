import { rateLimit } from 'express-rate-limit';
import { config } from '@/config';
import logger from '@/utils/logger';
import httpStatus from 'http-status';

export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute
  max: config.rateLimit.maxRequests, // max 100 requests per IP per windowMs
  message: {
    code: httpStatus.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP, please try again after a minute.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available, otherwise use remoteAddress
    return req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${options.keyGenerator(req)} on path: ${req.path}`);
    res.status(options.statusCode).send(options.message);
  },
});
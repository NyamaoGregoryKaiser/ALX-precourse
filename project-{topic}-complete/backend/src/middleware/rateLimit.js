const rateLimit = require('express-rate-limit');
const AppError = require('../utils/appError');
const logger = require('../config/logger');

const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000, 10), // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100, 10), // max 100 requests per minute per IP
  message: 'Too many requests from this IP, please try again after some time.',
  handler: (req, res, next) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.originalUrl}`);
    next(new AppError('Too many requests, please try again later.', 429));
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

module.exports = {
  rateLimiter,
};
const rateLimit = require('express-rate-limit');
const RedisStore = require('express-rate-limit-redis');
const { redisClient } = require('../utils/redisClient');
const config = require('../config/config');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const applyRateLimiting = () => {
  const limiter = rateLimit({
    store: new RedisStore({
      client: redisClient,
      expiry: config.rateLimit.windowMs / 1000, // expiry in seconds
    }),
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: new AppError(
      'Too many requests from this IP, please try again after an hour!',
      429
    ),
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      options.message.statusCode = options.statusCode; // Ensure error message has correct status
      next(options.message);
    },
    keyGenerator: (req, res) => req.ip, // Use IP address to identify clients
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  });

  return limiter;
};

module.exports = { applyRateLimiting };
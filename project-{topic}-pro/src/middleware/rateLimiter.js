const rateLimit = require('express-rate-limit');
const RedisStore = require('express-rate-limit-redis');
const redisClient = require('../utils/redis');
const logger = require('../utils/logger');

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl_global_', // Key prefix for Redis
    expiry: 15 * 60, // 15 minutes
  }),
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Allow 5 login attempts per minute per IP
  message: 'Too many authentication attempts from this IP, please try again after a minute',
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl_auth_',
    expiry: 60,
  }),
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
});

module.exports = {
  globalRateLimiter,
  authRateLimiter,
};
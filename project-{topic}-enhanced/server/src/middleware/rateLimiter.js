const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../utils/logger');

const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute
  max: config.rateLimit.maxRequests, // Limit each IP to 100 requests per `window` (here, per 1 minute)
  message:
    'Too many requests from this IP, please try again after a minute.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(options.statusCode).send(options.message);
  },
});

module.exports = {
  rateLimiter,
};
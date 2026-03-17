const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes
  max: config.rateLimit.max,           // Max 100 requests per 15 minutes per IP
  message: config.rateLimit.message,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    // Use the client's IP address as the key
    return req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on URL: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

module.exports = {
  apiLimiter,
};
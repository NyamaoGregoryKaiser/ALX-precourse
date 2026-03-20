const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

const apiLimiter = rateLimit({
  windowMs: parseInt(config.rateLimit.windowMs, 10), // Time frame for which requests are counted
  max: parseInt(config.rateLimit.maxRequests, 10), // Max requests per IP per windowMs
  message: 'Too many requests from this IP, please try again after some time.',
  headers: true, // Send X-RateLimit-* headers
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. Endpoint: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  }
});

module.exports = apiLimiter;
const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');
const { APIError } = require('../utils/errors');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requests

const limiter = rateLimit({
  windowMs, // time window in milliseconds
  max: maxRequests, // Max requests per windowMs
  message: new APIError('Too many requests, please try again after a minute.', 429),
  standardHeaders: true, // Return rate limit info in headers (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on URL: ${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
  keyGenerator: (req) => {
    // Use the client's IP address as the key for rate limiting
    // If behind a proxy, ensure req.ip is correctly configured (e.g., trust proxy settings)
    return req.ip;
  },
});

module.exports = limiter;
```
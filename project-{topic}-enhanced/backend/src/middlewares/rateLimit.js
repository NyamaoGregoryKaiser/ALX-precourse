```javascript
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: new AppError(429, 'Too many login attempts from this IP, please try again after 15 minutes'),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. Path: ${req.path}`);
    options.message.statusCode = 429; // Ensure status code is set for custom message
    next(options.message);
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit general API requests
  message: new AppError(429, 'Too many requests from this IP, please try again after an hour.'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`API Rate limit exceeded for IP: ${req.ip}. Path: ${req.path}`);
    options.message.statusCode = 429;
    next(options.message);
  }
});

module.exports = { authLimiter, apiLimiter };
```
```javascript
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes by default
  max: config.rateLimit.maxRequests, // Limit each IP to 100 requests per windowMs
  message: new AppError('Too many requests from this IP, please try again after an hour!', 429),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. Endpoint: ${req.originalUrl}`);
    options.message.statusCode = options.statusCode;
    next(options.message); // Pass the AppError to the error handling middleware
  },
});

module.exports = limiter;
```
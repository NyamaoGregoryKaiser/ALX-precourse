```javascript
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { rateLimitWindowMs, rateLimitMaxRequests } = require('../config/rateLimit'); // Assuming a rateLimit config

// Fallback if rateLimit config doesn't exist
const windowMs = rateLimitWindowMs || 60 * 1000; // 1 minute
const maxRequests = rateLimitMaxRequests || 100; // Max 100 requests per window

const apiRateLimiter = rateLimit({
  windowMs: windowMs,
  max: maxRequests,
  message: {
    success: false,
    message: `Too many requests from this IP, please try again after ${Math.ceil(windowMs / 1000 / 60)} minutes.`,
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}. ${options.message.message}`);
    res.status(options.statusCode).send(options.message);
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
});

module.exports = apiRateLimiter;
```
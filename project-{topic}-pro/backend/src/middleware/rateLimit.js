```javascript
// Note: This middleware is already applied globally in app.js using 'express-rate-limit'.
// This file is a placeholder/example if you wanted to define custom rate limiting logic
// or apply different limits to different routes.

const rateLimit = require('express-rate-limit');
const config = require('../config');

/**
 * Custom rate limiting middleware.
 * Can be used for specific routes if different limits are needed.
 */
const customRateLimiter = (windowMs = config.rateLimitWindowMs, max = config.rateLimitMaxRequests, message = 'Too many requests, please try again later.') => {
  return rateLimit({
    windowMs: windowMs,
    max: max,
    message: message,
    standardHeaders: true,
    legacyHeaders: false,
  });
};

module.exports = customRateLimiter;

// Example usage in a route file:
// const customRateLimiter = require('../../middleware/rateLimit');
// router.post('/login', customRateLimiter(60 * 1000, 5, 'Too many login attempts, try again in a minute.'), authController.login);
```
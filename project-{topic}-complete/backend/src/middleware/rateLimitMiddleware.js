```javascript
const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Global API rate limiter middleware.
 * Limits each IP to a certain number of requests within a windowMs.
 */
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 1 minute
    max: config.rateLimit.maxRequests,   // Max requests per windowMs
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after a minute.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,  // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    }
});

module.exports = { limiter };
```
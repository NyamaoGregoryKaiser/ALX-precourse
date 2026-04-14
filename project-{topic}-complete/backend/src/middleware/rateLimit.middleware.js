```javascript
const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');
const httpStatus = require('http-status');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: new AppError(httpStatus.TOO_MANY_REQUESTS, 'Too many requests from this IP, please try again after 15 minutes'),
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 authentication requests per windowMs
    message: new AppError(httpStatus.TOO_MANY_REQUESTS, 'Too many authentication attempts from this IP, please try again after 15 minutes'),
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    authLimiter,
};
```
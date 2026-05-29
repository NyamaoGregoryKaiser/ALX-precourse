```javascript
const rateLimit = require('express-rate-limit');
const httpStatus = require('http-status');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS } = require('../config/constants');
const logger = require('../config/logger');

const apiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, // 15 minutes
  max: RATE_LIMIT_MAX_REQUESTS, // Limit each IP to 100 requests per windowMs
  message: {
    code: httpStatus.TOO_MANY_REQUESTS,
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    // Use X-Forwarded-For if behind a proxy, otherwise req.ip
    return req.headers['x-forwarded-for'] || req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${options.keyGenerator(req, res)} on route: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Max 10 failed login attempts per IP per windowMs
  message: {
    code: httpStatus.TOO_MANY_REQUESTS,
    message: 'Too many login attempts from this IP, please try again after 5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.headers['x-forwarded-for'] || req.ip;
  },
  handler: (req, res, next, options) => {
    logger.warn(`Auth rate limit exceeded for IP: ${options.keyGenerator(req, res)} on route: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
```
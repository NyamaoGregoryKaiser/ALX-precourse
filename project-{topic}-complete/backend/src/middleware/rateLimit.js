const rateLimit = require('express-rate-limit');
const logger = require('./logger');
const { AppError } = require('../utils/errorHandler');

const apiLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000), // 1 minute
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100), // Max 100 requests per minute
    message: new AppError('Too many requests from this IP, please try again after a minute', 429),
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        next(options.message); // Pass the AppError to the error handling middleware
    }
});

module.exports = apiLimiter;
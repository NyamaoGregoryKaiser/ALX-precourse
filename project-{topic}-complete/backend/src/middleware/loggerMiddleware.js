```javascript
const logger = require('../utils/logger');

/**
 * Middleware to log incoming requests.
 */
const requestLogger = (req, res, next) => {
    logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, {
        ip: req.ip,
        body: req.body, // Be careful with sensitive data here
        headers: req.headers // Be careful with sensitive data here
    });
    next();
};

/**
 * Middleware to log errors, intended to be placed after all routes but before the main error handler.
 */
const errorLogger = (err, req, res, next) => {
    // Only log if it's not an intentional AppError (which is already logged in errorHandler)
    if (!err.isOperational) {
        logger.error(`Unhandled System Error: ${err.message}`, {
            path: req.originalUrl,
            method: req.method,
            ip: req.ip,
            stack: err.stack
        });
    }
    next(err); // Pass the error to the next error middleware (errorHandler)
};

module.exports = { requestLogger, errorLogger };
```
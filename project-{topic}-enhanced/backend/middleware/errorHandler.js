```javascript
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config/config');

const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not operational, convert it to an ApiError
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Something went wrong';
    error = new ApiError(statusCode, message, false, err.stack);
  }

  // Log error (only operational errors in production to avoid clutter)
  logger.error(`${error.statusCode} - ${error.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, { stack: error.stack });

  // Send response
  res.status(error.statusCode).json({
    status: 'error',
    message: error.message,
    ...(config.env === 'development' && { stack: error.stack }), // Show stack trace in dev
  });
};

module.exports = errorHandler;
```
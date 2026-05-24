```javascript
const httpStatus = require('http-status');
const { config } = require('../config/config');
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // If the error is not an operational error (e.g., from an external library or internal programming error),
  // convert it to an internal server error to prevent leaking sensitive information.
  if (!err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR]; // Generic error message
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }), // Only show stack in development
  };

  if (config.env === 'development') {
    logger.error(err);
  } else {
    logger.error(`Error: ${err.message} - Stack: ${err.stack}`);
  }

  res.status(statusCode).send(response);
};

module.exports = errorHandler;
```
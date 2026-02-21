const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);

  // Log request body for POST/PUT if it's not too large
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
    logger.debug(`Request Body: ${JSON.stringify(req.body)}`);
  }

  // Log response status and potentially response body
  const originalEnd = res.end;
  res.end = function (...args) {
    logger.info(`Response Status: ${res.statusCode}`);
    if (res.statusCode >= 400 && res.statusCode < 600) { // Log error responses
      logger.error(`Error Response Body: ${res._getData ? res._getData() : 'No body captured'}`);
    }
    originalEnd.apply(this, args);
  };

  next();
};

module.exports = requestLogger;
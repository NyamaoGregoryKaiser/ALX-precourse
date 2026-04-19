const logger = require('../config/logger');

const requestLogger = (req, res, next) => {
  logger.info(`HTTP Request: ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
};

const errorLogger = (err, req, res, next) => {
  logger.error(`Error: ${err.message} on ${req.method} ${req.originalUrl} from ${req.ip}`, { stack: err.stack });
  next(err); // Pass the error to the next error handling middleware
};

module.exports = {
  requestLogger,
  errorLogger,
};
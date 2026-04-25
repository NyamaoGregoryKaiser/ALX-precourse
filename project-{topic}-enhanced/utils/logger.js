```javascript
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const config = require('../config/config');

const customFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Include stack trace for errors
    customFormat
  ),
  transports: [
    // Console transport for development and general logging
    new transports.Console({
      format: combine(
        colorize({ all: true }), // Colorize output for console
        customFormat
      ),
      silent: process.env.NODE_ENV === 'test' // Don't log to console during tests
    }),
    // File transport for all logs (production)
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' }),
  ],
});

module.exports = logger;
```
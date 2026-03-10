```javascript
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors, json } = format;
const config = require('../config/config');

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }), // Log the stack trace for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // For production, log in JSON format
  ),
  transports: [
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

// If we're not in production then log to the `console` with a different format
if (config.env !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      consoleFormat
    ),
  }));
}

module.exports = logger;
```
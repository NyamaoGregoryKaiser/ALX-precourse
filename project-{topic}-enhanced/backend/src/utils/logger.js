```javascript
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const config = require('../config');

const customFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: config.logLevel,
  format: combine(
    errors({ stack: true }), // Log the stack trace for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(), // Add colors to console output
    customFormat
  ),
  transports: [
    new transports.Console(),
    // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

module.exports = logger;
```
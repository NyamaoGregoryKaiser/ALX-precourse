```javascript
const { createLogger, format, transports } = require('winston');
const config = require('../config');

const { combine, timestamp, printf, colorize, errors, json } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    json() // For production, log in JSON format for easier parsing by log aggregators
  ),
  transports: [
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// If we're not in production, log to the console with colorization
if (config.env !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      logFormat
    ),
  }));
}

module.exports = logger;
```
```javascript
const winston = require('winston');
const { combine, timestamp, printf, colorize, align } = winston.format;
const appConfig = require('../config/app');

// Custom format for logging
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${message} ${stack ? '\n' + stack : ''}`;
});

const logger = winston.createLogger({
  level: appConfig.env === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest })`
if (appConfig.env !== 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize({ all: true }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      align(),
      logFormat
    ),
  }));
}

module.exports = logger;
```
```javascript
const winston = require('winston');
const config = require('../config');

// Define log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Include stack trace for errors
  winston.format.splat(), // Interpolate string arguments
  winston.format.colorize(), // Colorize levels
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${message} ${stack ? '\n' + stack : ''}`;
  })
);

// Configure the Winston logger
const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      level: 'debug', // Console transport will always show debug and above
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.uncolorize(), // No colors in file logs
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.uncolorize(), // No colors in file logs
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [ // Catch uncaught exceptions
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [ // Catch unhandled promise rejections
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
  exitOnError: false, // Do not exit on handled exceptions.
});

// If not in production, log to console for development
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    ),
  }));
}

module.exports = logger;
```
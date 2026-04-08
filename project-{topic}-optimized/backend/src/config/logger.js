const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors, json } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info', // default log level
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Include stack trace for errors
    json(), // Output logs as JSON for easier parsing by log aggregation tools
  ),
  transports: [
    // Console transport for development
    new transports.Console({
      format: combine(
        colorize(), // Add colors for console output
        logFormat, // Custom format for console
      ),
      level: process.env.LOG_LEVEL || 'info',
    }),
    // File transport for production (optional, can also pipe to stdout for Docker)
    // new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// For development, if not running in a container, you might want a more readable console format
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      logFormat,
    ),
    level: process.env.LOG_LEVEL || 'debug',
  }));
}

module.exports = logger;
```
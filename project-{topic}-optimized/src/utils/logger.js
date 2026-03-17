const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const config = require('../config');

// Custom log format for development
const devLogFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Custom log format for production (JSON)
const prodLogFormat = printf(({ level, message, timestamp, stack }) => {
  return JSON.stringify({
    timestamp,
    level,
    message: stack || message,
    service: 'payment-processor',
    environment: config.env,
  });
});

const logger = createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Include stack trace for errors
    config.env === 'development' ? colorize() : format.uncolorize(), // Colorize only in dev
    config.env === 'development' ? devLogFormat : prodLogFormat
  ),
  transports: [
    new transports.Console(), // Log to console
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// If we're not in production, log to console in a more readable format
if (config.env !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      devLogFormat
    )
  }));
}

module.exports = logger;
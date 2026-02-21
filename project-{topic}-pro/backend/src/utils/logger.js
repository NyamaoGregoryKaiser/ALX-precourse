const { createLogger, format, transports } = require('winston');
const path = require('path');
const config = require('../config/config');

const { combine, timestamp, printf, colorize, errors, json, simple } = format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Custom format for file output
const fileFormat = printf(({ level, message, timestamp, stack }) => {
  return JSON.stringify({ timestamp, level, message: stack || message });
});

const logger = createLogger({
  level: config.logLevel, // Use level from config (e.g., 'info', 'debug')
  format: errors({ stack: true }), // Capture stack traces for errors
  transports: [
    // Console transport
    new transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        consoleFormat
      ),
      silent: process.env.NODE_ENV === 'test', // Suppress console output during tests
    }),
    // File transport for all logs (info and above)
    new transports.File({
      filename: path.join(__dirname, '../../logs/app.log'),
      level: 'info',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true, // Keep the most recent logs
    }),
    // File transport for error logs only
    new transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        fileFormat
      ),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true,
    }),
  ],
  exceptionHandlers: [
    new transports.File({
      filename: path.join(__dirname, '../../logs/exceptions.log'),
      format: combine(timestamp(), json()),
    }),
  ],
  rejectionHandlers: [
    new transports.File({
      filename: path.join(__dirname, '../../logs/rejections.log'),
      format: combine(timestamp(), json()),
    }),
  ],
});

// If not in production, log to console with simpler format
if (config.env === 'development') {
  logger.add(new transports.Console({
    format: combine(
      colorize(),
      simple()
    ),
    level: 'debug' // Log debug messages in dev
  }));
}

module.exports = logger;
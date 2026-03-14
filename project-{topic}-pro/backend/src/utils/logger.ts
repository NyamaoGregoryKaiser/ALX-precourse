import { createLogger, format, transports } from 'winston';
import { config } from '../config/env';

const { combine, timestamp, printf, colorize, errors, json } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

export const logger = createLogger({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    errors({ stack: true }), // Include stack trace for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    colorize(), // For console output
    logFormat // Custom format for console
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' })
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' })
  ]
});

// For production, prefer JSON format for better log aggregation
if (config.NODE_ENV === 'production') {
  logger.add(new transports.File({
    filename: 'logs/production.log',
    format: combine(timestamp(), json())
  }));
}
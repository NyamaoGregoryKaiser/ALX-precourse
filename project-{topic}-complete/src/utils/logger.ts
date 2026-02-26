import winston from 'winston';
import 'winston-daily-rotate-file'; // Import for daily rotation
import { LOG_LEVEL, NODE_ENV } from '../config';

const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const developmentFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  logFormat
);

const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json() // Log in JSON format for easier parsing by monitoring tools
);

const logger = winston.createLogger({
  level: LOG_LEVEL, // Set from environment variables
  format: NODE_ENV === 'development' ? developmentFormat : productionFormat,
  transports: [
    new winston.transports.Console(), // Log to console in all environments
    new winston.transports.DailyRotateFile({ // Log errors to a dedicated file
      filename: 'logs/error-%DATE%.log',
      level: 'error',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
    new winston.transports.DailyRotateFile({ // Log combined (info, warn, error) to another file
      filename: 'logs/combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
    }),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

export default logger;
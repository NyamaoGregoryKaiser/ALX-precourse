```typescript
import winston from 'winston';
import 'winston-daily-rotate-file';
import { env } from '../../config/env.config';
import path from 'path';

const logDir = 'logs'; // Directory for log files

// Define custom log levels (Winston already has info, warn, error, debug, http, verbose, silly)
// No need to define if using standard ones, but good to know how.

const transports = [
  // Console Transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let logMessage = `${timestamp} [${level}] ${message}`;
        if (Object.keys(metadata).length > 0) {
          logMessage += ` ${JSON.stringify(metadata)}`; // Include metadata for structured logging
        }
        return logMessage;
      })
    ),
    level: env.NODE_ENV === 'development' ? 'debug' : 'info', // More verbose in dev
  }),

  // File Transport for all logs (rotating daily)
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true, // Zip archived log files
    maxSize: '20m', // Max size of log file before rotation
    maxFiles: '14d', // Retain 14 days of logs
    level: 'info', // Log info and above to this file
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json() // JSON format for easier parsing by log analysis tools
    ),
  }),

  // File Transport for errors only (rotating daily)
  new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'error', // Only log errors to this file
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
  }),
];

export const logger = winston.createLogger({
  level: 'info', // Default log level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // Include stack trace for errors
    winston.format.json() // Default format for file logs
  ),
  transports: transports,
  exitOnError: false, // Do not exit on handled exceptions
});

// If we are in test environment, we might want to suppress console logs
// or use a different logger.
if (env.NODE_ENV === 'test') {
  logger.silent = true;
}
```

#### Modules (Example: Auth Module)
```typescript
import { createLogger, format, transports } from 'winston';
import { environment } from '../config/environment';

/**
 * @file Centralized logging utility.
 *
 * Configures Winston for structured logging, supporting different log levels
 * and output formats based on the environment (development/production).
 */

const { combine, timestamp, printf, colorize, errors, json } = format;

// Custom log format for console output in development
const devLogFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} ${level}: ${message}`;
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
  }
  if (stack) {
    log += `\n${stack}`;
  }
  return log;
});

export const logger = createLogger({
  level: environment.nodeEnv === 'production' ? 'info' : 'debug', // Default log level
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Include stack trace for errors
    json() // Use JSON format for production logs (easy for log aggregators)
  ),
  transports: [
    // Console transport for all environments
    new transports.Console({
      format: environment.nodeEnv === 'production'
        ? json()
        : combine(
            colorize(), // Colorize output for better readability in development
            devLogFormat
          ),
    }),
    // File transport for production (optional, can be replaced by cloud logging)
    ...(environment.nodeEnv === 'production'
      ? [
          new transports.File({ filename: 'logs/error.log', level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  exceptionHandlers: [
    new transports.Console(),
    ...(environment.nodeEnv === 'production'
        ? [new transports.File({ filename: 'logs/exceptions.log' })]
        : []),
  ],
  rejectionHandlers: [
    new transports.Console(),
    ...(environment.nodeEnv === 'production'
        ? [new transports.File({ filename: 'logs/rejections.log' })]
        : []),
  ],
});
```
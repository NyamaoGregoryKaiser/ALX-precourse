```typescript
import { createLogger, format, transports } from 'winston';
import config from '../config/config';

const { combine, timestamp, printf, colorize, errors, json } = format;

// Custom format for console logging in non-production environments
const consoleLogFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let logMessage = `${timestamp} ${level}: ${stack || message}`;
  // If there's additional metadata, stringify it
  if (Object.keys(metadata).length > 0) {
    logMessage += ` | ${JSON.stringify(metadata)}`;
  }
  return logMessage;
});

const logger = createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info', // 'debug' for dev, 'info' for prod
  format: combine(
    errors({ stack: true }), // Capture stack trace for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // Use JSON format for structured logging, especially in production environments
  ),
  transports: [
    // Log all errors to a dedicated error file
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Log all levels (info, warn, error, debug etc.) to a combined file
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  // Do not exit on handled exceptions, allow the global error handler to manage them
  exitOnError: false,
});

// For non-production environments, also log to the console with colorization
if (config.nodeEnv !== 'production') {
  logger.add(new transports.Console({
    format: combine(
      colorize(), // Add colors to console output
      consoleLogFormat // Use the custom console format
    ),
  }));
}

export default logger;
```
```typescript
import winston from 'winston';
import { config } from '../config';

/**
 * Centralized logging utility using Winston.
 * Configured to log to console and potentially a file (for production).
 */
const logger = winston.createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info', // More verbose in dev, less in production
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }), // Include stack trace for errors
    winston.format.splat(), // Allows for string interpolation
    winston.format.json() // JSON format for structured logging
  ),
  transports: [
    // Console transport for all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colorize output in console
        winston.format.simple() // Simple format for console readability
      ),
    }),
    // File transport for production (e.g., store logs in a file)
    // In a real production environment, you might send logs to a centralized logging service (e.g., ELK stack, Datadog, CloudWatch)
    ...(config.nodeEnv === 'production'
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// Stream for morgan http request logger
export const loggerStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
```
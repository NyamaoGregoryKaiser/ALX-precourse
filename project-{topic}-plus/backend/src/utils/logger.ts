import winston from 'winston';
import { env } from '../config/env';

// Define custom log levels and colors if desired
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for logs
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }), // Apply colors to the entire log message
  winston.format.printf((info) => {
    // Check if the info object contains a custom requestId
    const requestId = (info as any).requestId ? `[ReqID: ${(info as any).requestId}] ` : '';
    return `${info.timestamp} ${info.level}: ${requestId}${info.message}`;
  })
);

// Create the logger instance
export const logger = winston.createLogger({
  level: env.LOG_LEVEL, // Set the log level from environment config
  levels: levels,
  format: winston.format.json(), // Default to JSON format for production
  transports: [
    // Console transport for all levels in development/testing
    new winston.transports.Console({
      format: env.NODE_ENV === 'development' ? logFormat : winston.format.simple(), // Use custom format in dev, simple in prod console
    }),
    // File transport for all levels (e.g., combined logs)
    new winston.transports.File({ filename: 'logs/combined.log' }),
    // File transport for error level only
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Middleware to inject request ID into logger for better traceability
export const requestLogger = (req: any, res: any, next: any) => {
  req.requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, { requestId: req.requestId });
  next();
};

// Override console.log, console.error etc. to use Winston for consistency
if (env.NODE_ENV !== 'test') { // Avoid overriding in test env to prevent interfering with test output
  console.log = (...args) => logger.info(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
  console.debug = (...args) => logger.debug(args.join(' '));
}
```
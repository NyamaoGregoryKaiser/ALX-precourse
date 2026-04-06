```typescript
import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file'; // For daily rotating log files
import { ENV } from '../config';

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format for console
const consoleFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }), // Print stack trace for errors
  printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} ${level}: ${message} \n ${stack}`;
    }
    return `${timestamp} ${level}: ${message}`;
  })
);

// Custom log format for files (JSON for easier parsing by monitoring tools)
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  format.json()
);

const logger = createLogger({
  level: ENV.NODE_ENV === 'development' ? 'debug' : 'info', // Log level based on environment
  format: fileFormat, // Default format for files
  transports: [
    // Console transport
    new transports.Console({
      format: consoleFormat,
      level: ENV.NODE_ENV === 'test' ? 'error' : (ENV.NODE_ENV === 'development' ? 'debug' : 'info'), // Less verbose in test
    }),
    // Daily rotating file transport for info and above
    new transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m', // 20MB
      maxFiles: '14d', // Keep logs for 14 days
      level: 'info',
    }),
    // Daily rotating file transport for errors
    new transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Keep error logs longer
      level: 'error',
    }),
  ],
  exceptionHandlers: [ // Handle uncaught exceptions
    new transports.DailyRotateFile({
      filename: 'logs/exceptions-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
  rejectionHandlers: [ // Handle unhandled promise rejections
    new transports.DailyRotateFile({
      filename: 'logs/rejections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d',
    }),
  ],
});

export { logger };
```
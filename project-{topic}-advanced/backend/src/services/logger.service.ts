```typescript
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize, errors, json } = format;

// Custom log format for console
const devLogFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Create a logger instance
const logger: WinstonLogger = createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }), // Include stack trace for errors
    json() // Default to JSON format for file logging
  ),
  transports: [
    new transports.Console({
      level: 'debug',
      format: combine(
        colorize({ all: true }),
        devLogFormat
      ),
      silent: process.env.NODE_ENV === 'test' // Disable console logs during tests
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' }),
  ],
});

export default logger;
```

#### `backend/src/utils/jwt.ts`
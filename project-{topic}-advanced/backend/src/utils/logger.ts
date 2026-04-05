```typescript
import winston from 'winston';
import { env } from '../config';

const { combine, timestamp, printf, colorize, align } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} ${level}: ${message}`;
  if (Object.keys(metadata).length > 0) {
    // Stringify metadata, prettify if not in production
    const metaString = env.NODE_ENV === 'production'
      ? JSON.stringify(metadata)
      : JSON.stringify(metadata, null, 2);
    msg += `\n${metaString}`;
  }
  return msg;
});

const logger = winston.createLogger({
  level: env.LOG_LEVEL, // Use log level from config
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }), // Colorize output for console
        align(),
        logFormat
      ),
    }),
    // Optionally add file transports for production
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
    // new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

export default logger;
```
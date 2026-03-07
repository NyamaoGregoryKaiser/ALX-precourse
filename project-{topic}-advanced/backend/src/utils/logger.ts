```typescript
import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import { __prod__ } from '../config/env';

const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const fileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, '../../logs', 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m', // 20MB
  maxFiles: '14d', // Keep logs for 14 days
  level: 'info',
});

const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, '../../logs', 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
});

const logger = winston.createLogger({
  level: __prod__ ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    logFormat
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
      level: __prod__ ? 'info' : 'debug',
    }),
    fileTransport,
    errorFileTransport,
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs', 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs', 'rejections.log') }),
  ],
});

export default logger;
```
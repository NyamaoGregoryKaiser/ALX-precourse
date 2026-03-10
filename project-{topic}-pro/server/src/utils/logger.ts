import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';

const logFormat = winston.format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const fileRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(__dirname, '../../logs', 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'info',
});

export const Logger = winston.createLogger({
  level: 'info',
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
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    }),
    fileRotateTransport,
    new winston.transports.DailyRotateFile({
      filename: path.join(__dirname, '../../logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
    }),
  ],
  exitOnError: false, // do not exit on handled exceptions
});
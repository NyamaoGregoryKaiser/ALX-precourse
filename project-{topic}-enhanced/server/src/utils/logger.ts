import { createLogger, format, transports } from 'winston';
import 'winston-daily-rotate-file';
import { config } from '@/config';
import path from 'path';

const { combine, timestamp, printf, colorize, align } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const fileRotateTransport = new transports.DailyRotateFile({
  filename: path.join(__dirname, '../../logs', 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m', // 20MB
  maxFiles: '14d', // Keep logs for 14 days
  level: config.logLevel,
});

const logger = createLogger({
  level: config.logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // Capture stack traces for errors
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        align(),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        logFormat
      ),
    }),
    fileRotateTransport,
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

export default logger;
import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports, Logger } from 'winston';
import 'winston-daily-rotate-file';

@Injectable()
export class AppLogger implements LoggerService {
  private readonly logger: Logger;

  constructor() {
    const logFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.json(),
    );

    const fileTransport = new transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m', // 20MB
      maxFiles: '14d', // Keep logs for 14 days
      level: 'info',
    });

    const errorFileTransport = new transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error',
    });

    const consoleTransport = new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ level, message, timestamp, context, trace }) => {
          return `${timestamp} [${context || 'App'}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
        }),
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    });

    this.logger = createLogger({
      level: 'info',
      format: logFormat,
      transports: [
        consoleTransport,
        fileTransport,
        errorFileTransport,
      ],
      exceptionHandlers: [
        new transports.DailyRotateFile({
          filename: 'logs/exceptions-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
      ],
      rejectionHandlers: [
        new transports.DailyRotateFile({
          filename: 'logs/rejections-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
        }),
      ],
    });
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, { context, trace });
  }

  warn(message: any, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: any, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.debug(message, { context });
    }
  }

  verbose(message: any, context?: string) {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.verbose(message, { context });
    }
  }
}
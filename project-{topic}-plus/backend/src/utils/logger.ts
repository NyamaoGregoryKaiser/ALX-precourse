import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json() // Use JSON format for structured logging
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.simple()
);

export class LoggerService {
  private static logger: winston.Logger;

  static getLogger(): winston.Logger {
    if (!LoggerService.logger) {
      LoggerService.logger = winston.createLogger({
        level: config.env === 'production' ? 'info' : 'debug',
        levels: winston.config.npm.levels,
        format: logFormat,
        transports: [
          new winston.transports.Console({
            format: config.env === 'development' ? winston.format.combine(winston.format.colorize(), winston.format.simple()) : logFormat,
          }),
          // Add file transport for production environments
          ...(config.env === 'production' ? [
            new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'logs/combined.log' }),
          ] : [])
        ],
        exceptionHandlers: [
          new winston.transports.File({ filename: 'logs/exceptions.log' })
        ],
        rejectionHandlers: [
          new winston.transports.File({ filename: 'logs/rejections.log' })
        ]
      });

      // If we're not in production then log to the `console` with the format:
      // `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
      if (config.env !== 'production') {
        LoggerService.logger.debug('Logging initialized in development mode.');
      }
    }
    return LoggerService.logger;
  }
}

export const logger = LoggerService.getLogger();
```
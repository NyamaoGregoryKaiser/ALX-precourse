import { ConsoleLogger, Injectable, Module } from '@nestjs/common';
import * as winston from 'winston';
import 'winston-daily-rotate-file'; // For daily rotating log files
import { ConfigService } from '@nestjs/config';

/**
 * Custom Winston-based logger service for NestJS.
 * Provides structured logging with different levels (info, warn, error, debug, verbose).
 * Logs to console during development and to rotating files in production.
 */
@Injectable()
export class LoggerService extends ConsoleLogger {
  private readonly logger: winston.Logger;

  constructor(private configService: ConfigService) {
    super(); // Call ConsoleLogger constructor to maintain NestJS default console logging behavior
    this.logger = winston.createLogger({
      level: configService.get<string>('NODE_ENV') === 'production' ? 'info' : 'debug',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }), // Include stack trace for errors
        winston.format.splat(),
        winston.format.json(), // JSON format for structured logging
      ),
      transports: [
        // Console transport for all environments (human-readable for dev, JSON for prod)
        new winston.transports.Console({
          format:
            configService.get<string>('NODE_ENV') === 'production'
              ? winston.format.combine(winston.format.json())
              : winston.format.combine(
                  winston.format.colorize(),
                  winston.format.simple(), // Simple format for development console
                ),
        }),
      ],
    });

    // Add file transports only in non-test environments
    if (configService.get<string>('NODE_ENV') !== 'test') {
      this.logger.add(
        new winston.transports.DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true, // Zip archived log files
          maxSize: '20m', // Max size of log file (20MB)
          maxFiles: '14d', // Retain logs for 14 days
          level: 'info', // Log info and above to main application log
        }),
      );
      this.logger.add(
        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '10m',
          maxFiles: '7d',
          level: 'error', // Log only errors to a separate error log
        }),
      );
    }

    // Set NestJS ConsoleLogger context
    this.setContext('Application');
  }

  /**
   * Logs a message at the 'log' level (info level in Winston).
   * @param message The message to log.
   * @param context Optional context for the log.
   * @param data Optional additional data to log.
   */
  log(message: any, context?: string, data?: object) {
    const logObject = {
      message,
      context: context || this.context,
      ...data,
    };
    this.logger.info(logObject);
    super.log(message, context); // Also output to NestJS console if configured
  }

  /**
   * Logs a message at the 'error' level.
   * @param message The error message.
   * @param stack Optional stack trace.
   * @param context Optional context for the log.
   * @param data Optional additional data to log.
   */
  error(message: any, stack?: string, context?: string, data?: object) {
    const logObject = {
      message,
      stack,
      context: context || this.context,
      ...data,
    };
    this.logger.error(logObject);
    super.error(message, stack, context);
  }

  /**
   * Logs a message at the 'warn' level.
   * @param message The warning message.
   * @param context Optional context for the log.
   * @param data Optional additional data to log.
   */
  warn(message: any, context?: string, data?: object) {
    const logObject = {
      message,
      context: context || this.context,
      ...data,
    };
    this.logger.warn(logObject);
    super.warn(message, context);
  }

  /**
   * Logs a message at the 'debug' level.
   * @param message The debug message.
   * @param context Optional context for the log.
   * @param data Optional additional data to log.
   */
  debug(message: any, context?: string, data?: object) {
    const logObject = {
      message,
      context: context || this.context,
      ...data,
    };
    this.logger.debug(logObject);
    super.debug(message, context);
  }

  /**
   * Logs a message at the 'verbose' level.
   * @param message The verbose message.
   * @param context Optional context for the log.
   * @param data Optional additional data to log.
   */
  verbose(message: any, context?: string, data?: object) {
    const logObject = {
      message,
      context: context || this.context,
      ...data,
    };
    this.logger.verbose(logObject);
    super.verbose(message, context);
  }
}

/**
 * LoggerModule to provide the LoggerService globally.
 * This makes `LoggerService` injectable throughout the application.
 */
@Module({
  imports: [ConfigService], // Inject ConfigService into LoggerService constructor
  providers: [LoggerService, ConfigService],
  exports: [LoggerService],
})
export class LoggerModule {}
import { createLogger, format, transports, Logger as WinstonLogger } from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: __dirname + '/../../.env' });
dotenv.config({ path: __dirname + '/../.env', override: true });

const logDir = 'logs'; // Directory to store log files
const logLevel = process.env.LOG_LEVEL || 'info';
const logFileName = process.env.LOG_FILE_NAME || 'application-%DATE%.log';

const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
});

const logger: WinstonLogger = createLogger({
    level: logLevel,
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        http: 3,
        verbose: 4,
        debug: 5,
        silly: 6,
    },
    format: combine(
        errors({ stack: true }), // Include stack trace for errors
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        logFormat
    ),
    transports: [
        // Console transport for development
        new transports.Console({
            format: combine(
                colorize(),
                logFormat
            ),
            level: logLevel,
            handleExceptions: true,
        }),
        // Daily rotate file transport for production
        new transports.DailyRotateFile({
            filename: path.join(logDir, logFileName),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m', // Max file size of 20MB
            maxFiles: '14d', // Retain logs for 14 days
            level: 'info', // Always log info and above to file
            handleExceptions: true,
            auditFile: path.join(logDir, 'audit.json'), // File to keep track of rotated files
        }),
        // Error log file transport (always log errors to a separate file)
        new transports.DailyRotateFile({
            filename: path.join(logDir, 'error-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            level: 'error', // Only log error and above to this file
            handleExceptions: true,
            auditFile: path.join(logDir, 'error-audit.json'),
        }),
    ],
    exceptionHandlers: [
        new transports.DailyRotateFile({
            filename: path.join(logDir, 'exceptions-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            auditFile: path.join(logDir, 'exception-audit.json'),
        }),
    ],
    rejectionHandlers: [
        new transports.DailyRotateFile({
            filename: path.join(logDir, 'rejections-%DATE%.log'),
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
            auditFile: path.join(logDir, 'rejection-audit.json'),
        }),
    ],
});

export default logger;
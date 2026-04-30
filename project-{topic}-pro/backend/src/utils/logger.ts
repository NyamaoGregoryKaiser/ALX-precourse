```typescript
import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, align } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let logMessage = `${timestamp} [${level}] ${message}`;
    if (Object.keys(metadata).length) {
        logMessage += ` ${JSON.stringify(metadata)}`;
    }
    return logMessage;
});

export const logger = winston.createLogger({
    level: config.logLevel, // debug, info, warn, error
    format: combine(
        colorize({ all: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        align(),
        logFormat
    ),
    transports: [
        new winston.transports.Console(),
        // Uncomment and configure for file logging in production
        // new winston.transports.File({
        //     filename: 'logs/error.log',
        //     level: 'error',
        //     format: combine(timestamp(), logFormat)
        // }),
        // new winston.transports.File({
        //     filename: 'logs/combined.log',
        //     format: combine(timestamp(), logFormat)
        // })
    ],
    exceptionHandlers: [
        new winston.transports.Console(),
        // new winston.transports.File({ filename: 'logs/exceptions.log' })
    ],
    rejectionHandlers: [
        new winston.transports.Console(),
        // new winston.transports.File({ filename: 'logs/rejections.log' })
    ]
});
```
```javascript
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const config = require('../config/config');

const customFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    if (stack) {
        logMessage = `${timestamp} ${level}: ${message}\n${stack}`;
    }
    if (Object.keys(metadata).length) {
        logMessage += ` ${JSON.stringify(metadata)}`;
    }
    return logMessage;
});

const logger = createLogger({
    level: config.env === 'development' ? 'debug' : 'info', // More verbose in dev
    format: combine(
        errors({ stack: true }), // This ensures the stack trace is captured
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        customFormat
    ),
    transports: [
        new transports.Console({
            format: combine(
                colorize(),
                customFormat
            )
        }),
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        new transports.File({ filename: 'logs/combined.log' })
    ],
    exceptionHandlers: [
        new transports.File({ filename: 'logs/exceptions.log' })
    ],
    rejectionHandlers: [
        new transports.File({ filename: 'logs/rejections.log' })
    ]
});

module.exports = logger;
```
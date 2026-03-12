const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors, json } = format;
const path = require('path');

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
    let msg = `${timestamp} ${level}: ${message}`;
    if (stack) {
        msg += `\n${stack}`;
    }
    if (Object.keys(metadata).length > 0) {
        msg += `\n${JSON.stringify(metadata, null, 2)}`;
    }
    return msg;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info', // Default log level
    format: combine(
        errors({ stack: true }), // Log stack trace for errors
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        json() // Use JSON format for file logs
    ),
    transports: [
        new transports.File({
            filename: process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs/app.log'),
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
            level: process.env.LOG_LEVEL || 'info'
        }),
        new transports.Console({
            format: combine(
                colorize(), // Colorize console output
                logFormat // Use custom format for console
            ),
            level: process.env.LOG_LEVEL || 'info'
        })
    ],
    exceptionHandlers: [
        new transports.File({ filename: path.join(__dirname, '../../logs/exceptions.log') })
    ],
    rejectionHandlers: [
        new transports.File({ filename: path.join(__dirname, '../../logs/rejections.log') })
    ]
});

// Create logs directory if it doesn't exist (for file transport)
const fs = require('fs');
const logDir = path.dirname(process.env.LOG_FILE_PATH || path.join(__dirname, '../../logs/app.log'));
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

module.exports = logger;
```javascript
// src/utils/logger.js
const winston = require('winston');
const config = require('../config/config');

const enumerateErrorFormat = winston.format((info) => {
    if (info instanceof Error) {
        Object.assign(info, { message: info.stack });
    }
    return info;
});

// ALX Principle: Structured Logging
// Use Winston for robust and configurable logging, separating concerns for different environments.
const logger = winston.createLogger({
    level: config.env === 'development' ? 'debug' : 'info',
    format: winston.format.combine(
        enumerateErrorFormat(),
        config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
        winston.format.splat(),
        winston.format.timestamp(), // Add timestamp
        winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
    ),
    transports: [
        new winston.transports.Console({
            stderrLevels: ['error'],
        }),
        // In production, consider adding file transports, cloud logging (e.g., Stackdriver, CloudWatch)
        // new winston.transports.File({ filename: 'error.log', level: 'error' }),
        // new winston.transports.File({ filename: 'combined.log' }),
    ],
});

module.exports = logger;
```
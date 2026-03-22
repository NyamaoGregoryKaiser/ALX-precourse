```javascript
const winston = require('winston');

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

const transports = [
    new winston.transports.Console({
        level: process.env.LOG_LEVEL || 'info', // Default to info if not specified
    }),
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
    }),
    new winston.transports.File({
        filename: 'logs/combined.log',
    }),
];

const logger = winston.createLogger({
    levels,
    format,
    transports,
    exitOnError: false, // Do not exit on handled exceptions
});

module.exports = logger;
```
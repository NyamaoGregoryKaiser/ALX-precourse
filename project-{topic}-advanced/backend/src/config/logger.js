const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;
const morgan = require('morgan');

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }), // Include stack trace for errors
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(
        colorize(),
        logFormat
      ),
    }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: 'logs/rejections.log' }),
  ],
});

// Middleware for logging HTTP requests using Winston
const requestLogger = morgan(function (tokens, req, res) {
  const status = tokens.status(req, res);
  const statusColor = status >= 500 ? 'red' : status >= 400 ? 'yellow' : status >= 300 ? 'cyan' : 'green';
  return [
    tokens.method(req, res),
    tokens.url(req, res),
    `<span style="color:${statusColor}">${status}</span>`,
    tokens['response-time'](req, res), 'ms'
  ].join(' ');
}, {
  stream: {
    write: (message) => logger.http(message.trim()),
  },
  skip: (req, res) => process.env.NODE_ENV === 'test' // Skip HTTP logging during tests
});

module.exports = {
  logger,
  requestLogger,
};
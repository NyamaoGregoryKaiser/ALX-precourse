const logger = require('../config/logger');

// Custom stream for Morgan to pipe to Winston
const stream = {
  write: (message) => logger.info(message.trim()),
};

// Middleware to log detailed request info
const loggerMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const durationInMilliseconds = getDurationInMilliseconds(start);
    logger.info(`Request ${req.method} ${req.originalUrl} finished in ${durationInMilliseconds.toLocaleString()} ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseSize: res.get('Content-Length') || 0,
      responseTime: `${durationInMilliseconds}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });
  });

  res.on('close', () => {
    // This event fires if the connection is closed before the response is finished
    if (!res.headersSent) {
      const durationInMilliseconds = getDurationInMilliseconds(start);
      logger.warn(`Request ${req.method} ${req.originalUrl} closed prematurely after ${durationInMilliseconds.toLocaleString()} ms`, {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
    }
  });

  next();
};

const getDurationInMilliseconds = (start) => {
  const NS_PER_SEC = 1e9;
  const NS_TO_MS = 1e6;
  const diff = process.hrtime(start);
  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};

module.exports = {
  stream,
  loggerMiddleware,
};
```
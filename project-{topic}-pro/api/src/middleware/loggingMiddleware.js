```javascript
const morgan = require('morgan');
const logger = require('../config/logger');
const config = require('../config/config');

// Custom token to get body for logging POST/PUT requests (careful with sensitive data)
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    // Exclude password from logging
    const body = { ...req.body };
    if (body.password) {
      body.password = '[REDACTED]';
    }
    return JSON.stringify(body);
  }
  return '';
});

// Custom success logger
const successLogger = morgan(
  (tokens, req, res) => {
    return [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'), '-',
      tokens['response-time'](req, res), 'ms',
      tokens.body(req, res), // Include body only for success, if configured
    ].join(' ');
  },
  {
    skip: (req, res) => res.statusCode >= 400, // Log only successful responses
    stream: { write: (message) => logger.info(message.trim()) },
  }
);

// Custom error logger
const errorLogger = morgan(
  (tokens, req, res) => {
    return [
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'), '-',
      tokens['response-time'](req, res), 'ms',
      `Error: ${res.locals.errorMessage || 'No specific error message'}`, // Custom error message
      tokens.body(req, res),
    ].join(' ');
  },
  {
    skip: (req, res) => res.statusCode < 400, // Log only error responses
    stream: { write: (message) => logger.error(message.trim()) },
  }
);

module.exports = {
  successLogger,
  errorLogger,
};
```
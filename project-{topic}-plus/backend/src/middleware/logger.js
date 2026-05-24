```javascript
const morgan = require('morgan');
const logger = require('../utils/logger');
const { config } = require('../config/config');

// Define custom stream for Morgan to use Winston
const stream = {
  write: (message) => logger.info(message.trim()),
};

// Skip logging for health checks or during tests
const skip = (req, res) => {
  const isHealthCheck = req.originalUrl === '/health' || req.originalUrl === '/api/health';
  const isTestEnv = config.env === 'test';
  return isHealthCheck || isTestEnv;
};

// Morgan middleware configuration
const httpLogger = morgan(
  ':method :url :status :res[content-length] - :response-time ms',
  { stream, skip }
);

module.exports = httpLogger;
```
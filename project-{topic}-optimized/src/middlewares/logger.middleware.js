const morgan = require('morgan');
const logger = require('../utils/logger');
const config = require('../config');

// Custom Morgan token to log user ID if available
morgan.token('user-id', (req) => {
  return req.user ? req.user.id : 'anonymous';
});

// Custom Morgan token to log user role if available
morgan.token('user-role', (req) => {
  return req.user ? req.user.role : 'none';
});

// Custom format combining predefined tokens and custom ones
const morganFormat = config.env === 'development' ? ':method :url :status :response-time ms - User ID: :user-id - Role: :user-role' : 'combined';

const httpLogger = morgan(morganFormat, {
  stream: {
    write: (message) => {
      logger.info(message.trim());
    }
  },
  // Skip logging health checks or other noisy requests
  skip: (req, res) => req.originalUrl === '/health' && res.statusCode < 400
});

module.exports = httpLogger;
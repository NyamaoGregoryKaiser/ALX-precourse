```javascript
require('dotenv').config();

const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoURI: process.env.MONGO_URI || 'mongodb://localhost:27017/task_manager_db',
  jwtSecret: process.env.JWT_SECRET || 'supersecretkey',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || '*', // Be specific in production, e.g., 'http://localhost:3000'
};

module.exports = config;
```
```javascript
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  appSecret: process.env.APP_SECRET || 'a_very_secret_app_key_change_me_in_prod',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',

  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret_key_change_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret_key_change_me',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  db: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'your_db_user',
    pass: process.env.DB_PASS || 'your_db_password',
    name: process.env.DB_NAME || 'enterprise_db',
    testName: process.env.DB_TEST_NAME || 'enterprise_test_db', // Separate DB for testing
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100, // max 100 requests per windowMs
  },

  logLevel: process.env.LOG_LEVEL || 'info', // error, warn, info, http, verbose, debug, silly
};

module.exports = config;
```
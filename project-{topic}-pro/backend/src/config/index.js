```javascript
require('dotenv').config(); // Load environment variables from .env file

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  appName: process.env.APP_NAME || 'CMS Project',

  db: {
    client: process.env.DB_CLIENT || 'pg',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
    user: process.env.DB_USER || 'cms_user',
    password: process.env.DB_PASSWORD || 'cms_password',
    name: process.env.DB_NAME || 'cms_db',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey', // CHANGE THIS IN PRODUCTION
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    password: process.env.REDIS_PASSWORD || '',
  },

  logLevel: process.env.LOG_LEVEL || 'info',
};

// Validate critical environment variables
if (!config.jwt.secret || config.jwt.secret === 'supersecretjwtkey') {
  console.warn('WARNING: JWT_SECRET is not set or is using a default value. Please set a strong secret in your .env file.');
}
if (config.env === 'production' && (!config.db.password || config.db.user === 'cms_user')) {
  console.error('ERROR: Production environment requires strong DB credentials. Please update DB_USER and DB_PASSWORD.');
  // process.exit(1); // Consider exiting for critical misconfigurations in production
}

module.exports = config;
```
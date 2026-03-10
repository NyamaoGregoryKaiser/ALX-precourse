```javascript
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  sessionSecret: process.env.SESSION_SECRET || 'anothersupersecret',
  database: {
    url: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/cms_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  cache: {
    ttl: parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10), // 1 hour
  }
};

module.exports = config;
```
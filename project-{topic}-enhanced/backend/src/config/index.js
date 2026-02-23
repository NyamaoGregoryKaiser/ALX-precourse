```javascript
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiration: process.env.JWT_EXPIRATION,
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  frontendUrl: process.env.FRONTEND_URL,
  redisUrl: process.env.CACHE_REDIS_URL,
};

// Validate essential configurations
if (!config.jwt.secret) {
  throw new Error('JWT_SECRET not defined in environment variables');
}
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL not defined in environment variables');
}
if (config.env === 'production' && (!config.admin.email || !config.admin.password)) {
  console.warn('Admin credentials not set for production. Please configure ADMIN_EMAIL and ADMIN_PASSWORD.');
}

module.exports = config;
```
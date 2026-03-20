require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey',
    accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 30,
    refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS || 30
  },
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/taskdb?schema=public',
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined // Optional Redis password
  },
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 100 // max 100 requests per windowMs
  }
};

module.exports = config;
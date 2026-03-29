import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, `../../.env.${process.env.NODE_ENV || 'development'}`);
dotenv.config({ path: envPath });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_DATABASE,
    testName: process.env.DB_DATABASE_TEST,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'supersecretjwtrefreshkey',
    accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
    refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // Max 100 requests per window
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
};
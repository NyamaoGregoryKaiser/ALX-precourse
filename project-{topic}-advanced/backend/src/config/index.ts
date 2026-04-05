```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  API_VERSION: string;
  CORS_ORIGIN: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SYNC: boolean;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  REDIS_HOST: string;
  REDIS_PORT: number;
  CACHE_TTL_SECONDS: number;
  LOG_LEVEL: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  MONITOR_CHECK_INTERVAL_CRON: string;
}

const getEnv = (key: string, defaultValue?: any): string => {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is not set.`);
  }
  return value || defaultValue;
};

export const env: EnvConfig = {
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  PORT: parseInt(getEnv('PORT', '5000'), 10),
  API_VERSION: getEnv('API_VERSION', 'v1'),
  CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:3000'),

  DB_HOST: getEnv('DB_HOST', 'localhost'),
  DB_PORT: parseInt(getEnv('DB_PORT', '5432'), 10),
  DB_USER: getEnv('DB_USER', 'performancepulse_user'),
  DB_PASSWORD: getEnv('DB_PASSWORD', 'performancepulse_password'),
  DB_DATABASE: getEnv('DB_DATABASE', 'performancepulse_db'),
  DB_SYNC: getEnv('DB_SYNC', 'false') === 'true', // Should be false in production

  JWT_SECRET: getEnv('JWT_SECRET', 'supersecretjwtkeythatshouldbeverylongandrandominproduction'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '1h'),

  REDIS_HOST: getEnv('REDIS_HOST', 'localhost'),
  REDIS_PORT: parseInt(getEnv('REDIS_PORT', '6379'), 10),
  CACHE_TTL_SECONDS: parseInt(getEnv('CACHE_TTL_SECONDS', '3600'), 10),

  LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),

  RATE_LIMIT_WINDOW_MS: parseInt(getEnv('RATE_LIMIT_WINDOW_MS', '60000'), 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(getEnv('RATE_LIMIT_MAX_REQUESTS', '100'), 10),

  MONITOR_CHECK_INTERVAL_CRON: getEnv('MONITOR_CHECK_INTERVAL_CRON', '* * * * *'), // Every minute
};
```
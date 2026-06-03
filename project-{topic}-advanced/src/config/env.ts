```typescript
import dotenv from 'dotenv';
import { logger } from '../utils/logger';

dotenv.config();

interface EnvConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  DATABASE_URL_TEST: string;
  JWT_SECRET: string;
  JWT_EXPIRATION_TIME: string;
  REFRESH_TOKEN_SECRET: string;
  REFRESH_TOKEN_EXPIRATION_TIME: string;
  REDIS_URL: string;
  LOG_LEVEL: string;
  CLIENT_ORIGIN?: string; // Optional for CORS
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    logger.error(`Environment variable ${key} is not set.`);
    process.exit(1);
  }
  return value;
};

export const env: EnvConfig = {
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  PORT: parseInt(getEnvVar('PORT', '5000'), 10),
  DATABASE_URL: getEnvVar('DATABASE_URL'),
  DATABASE_URL_TEST: getEnvVar('DATABASE_URL_TEST', 'postgresql://test_user:test_password@localhost:5433/taskdb_test?schema=public'),
  JWT_SECRET: getEnvVar('JWT_SECRET'),
  JWT_EXPIRATION_TIME: getEnvVar('JWT_EXPIRATION_TIME', '1h'),
  REFRESH_TOKEN_SECRET: getEnvVar('REFRESH_TOKEN_SECRET'),
  REFRESH_TOKEN_EXPIRATION_TIME: getEnvVar('REFRESH_TOKEN_EXPIRATION_TIME', '7d'),
  REDIS_URL: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
  LOG_LEVEL: getEnvVar('LOG_LEVEL', 'info'),
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN, // Optional
};

// Basic validation for critical variables
if (!env.JWT_SECRET || env.JWT_SECRET.length < 32) {
  logger.warn('JWT_SECRET is weak or missing. Please set a strong secret.');
}
if (!env.REFRESH_TOKEN_SECRET || env.REFRESH_TOKEN_SECRET.length < 32) {
  logger.warn('REFRESH_TOKEN_SECRET is weak or missing. Please set a strong secret.');
}

logger.info(`Environment loaded: NODE_ENV=${env.NODE_ENV}, PORT=${env.PORT}`);
```
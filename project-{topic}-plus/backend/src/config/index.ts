```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  redisUrl: string;
  corsOrigin: string;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

const envVars = process.env;

export const config: Config = {
  port: parseInt(envVars.PORT || '5000', 10),
  databaseUrl: envVars.DATABASE_URL || 'postgresql://user:password@localhost:5432/realtime_chat_db?schema=public',
  jwtSecret: envVars.JWT_SECRET || 'super_secret_jwt_key_please_change_this',
  redisUrl: envVars.REDIS_URL || 'redis://localhost:6379',
  corsOrigin: envVars.NODE_ENV === 'production' ? envVars.PROD_CLIENT_URL || '*' : envVars.DEV_CLIENT_URL || 'http://localhost:3000',
  rateLimitWindowMs: parseInt(envVars.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  rateLimitMaxRequests: parseInt(envVars.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests
};

// Validate essential environment variables
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not defined in environment variables.');
}
if (!config.jwtSecret) {
  throw new Error('JWT_SECRET is not defined in environment variables.');
}
if (!config.redisUrl) {
  throw new Error('REDIS_URL is not defined in environment variables.');
}
```
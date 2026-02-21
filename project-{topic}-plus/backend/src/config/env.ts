```typescript
import dotenv from 'dotenv';
dotenv.config();

// Validate essential environment variables
const requiredEnvVars = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRATION_TIME',
  'REFRESH_TOKEN_SECRET',
  'REFRESH_TOKEN_EXPIRATION_TIME',
  'REDIS_HOST',
  'REDIS_PORT',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'LOG_LEVEL',
];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`Error: Environment variable ${varName} is not set.`);
    process.exit(1);
  }
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_EXPIRATION_TIME: process.env.JWT_EXPIRATION_TIME!, // e.g., '1h', '15m'
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET!,
  REFRESH_TOKEN_EXPIRATION_TIME: process.env.REFRESH_TOKEN_EXPIRATION_TIME!, // e.g., '7d', '30d'
  REDIS_HOST: process.env.REDIS_HOST!,
  REDIS_PORT: parseInt(process.env.REDIS_PORT || '6379', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info', // debug, http, info, warn, error
};
```
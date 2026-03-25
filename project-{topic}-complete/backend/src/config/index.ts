```typescript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

interface Config {
  env: string;
  port: number;
  database: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  jwt: {
    secret: string;
    accessExpirationMinutes: number;
    refreshExpirationDays: number;
  };
  redis: {
    host: string;
    port: number;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  corsOrigins: string[];
  logLevel: string;
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'chat_app_db',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey',
    accessExpirationMinutes: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRATION_MINUTES || '60', 10),
    refreshExpirationDays: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRATION_DAYS || '7', 10),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests per minute
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
```
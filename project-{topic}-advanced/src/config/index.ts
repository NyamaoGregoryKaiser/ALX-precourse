```typescript
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  DATABASE: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    USERNAME: process.env.DB_USERNAME || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || 'password',
    DATABASE: process.env.DB_NAME || 'datavizdb',
    SYNCHRONIZE: process.env.DB_SYNCHRONIZE === 'true', // Use with caution in production
    LOGGING: process.env.DB_LOGGING === 'true',
  },
  JWT_SECRET: process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbemorecomplex',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : 100, // max 100 requests per window
  CACHE_TTL_SECONDS: process.env.CACHE_TTL_SECONDS ? parseInt(process.env.CACHE_TTL_SECONDS, 10) : 300, // 5 minutes
};

export default config;
```
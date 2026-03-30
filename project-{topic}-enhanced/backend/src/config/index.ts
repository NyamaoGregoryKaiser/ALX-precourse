import dotenv from 'dotenv';
import path from 'path';
import { CacheConfig } from '../types';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  jwt: {
    secret: process.env.JWT_SECRET || 'supersecretjwtkey',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    username: process.env.DB_USERNAME || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_DATABASE || 'task_db',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
  },
  log: {
    level: process.env.LOG_LEVEL || 'info',
  },
  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  },
  cache: {
    store: process.env.CACHE_STORE || 'redis', // 'memory' or 'redis'
    ttl: process.env.CACHE_TTL ? parseInt(process.env.CACHE_TTL, 10) : 60, // seconds
    max: process.env.CACHE_MAX ? parseInt(process.env.CACHE_MAX, 10) : 100, // max items for memory store
  } as CacheConfig,
};

// Configure Redis if cache store is set to redis
if (config.cache.store === 'redis') {
  config.cache.host = config.redis.host;
  config.cache.port = config.redis.port;
}

export default config;
```

#### `backend/src/config/logger.ts` (Winston logger)
```typescript
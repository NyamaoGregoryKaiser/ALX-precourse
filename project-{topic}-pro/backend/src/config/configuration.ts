```typescript
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3001,
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USER || 'admin',
    password: process.env.DATABASE_PASSWORD || 'password',
    name: process.env.DATABASE_NAME || 'task_manager_db',
    synchronize: process.env.NODE_ENV === 'development' ? true : false, // NOT for production
    logging: process.env.NODE_ENV === 'development' ? true : false,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  throttler: {
    ttl: parseInt(process.env.THROTTLER_TTL, 10) || 60, // 60 seconds
    limit: parseInt(process.env.THROTTLER_LIMIT, 10) || 100, // 100 requests
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '', // Optional
    ttl: parseInt(process.env.REDIS_CACHE_TTL, 10) || 3600, // Default cache TTL in seconds (1 hour)
  },
  frontend_url: process.env.FRONTEND_URL || 'http://localhost:3000',
});
```
```typescript
export default () => ({
  NODE_ENV: process.env.NODE_ENV || 'development',
  APP_PORT: parseInt(process.env.APP_PORT || '3000', 10),
  APP_NAME: process.env.APP_NAME || 'CMS Backend',
  DATABASE: {
    HOST: process.env.DB_HOST || 'localhost',
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
    USERNAME: process.env.DB_USERNAME || 'postgres',
    PASSWORD: process.env.DB_PASSWORD || 'postgres',
    NAME: process.env.DB_NAME || 'cms_db',
    SYNCHRONIZE: process.env.DB_SYNCHRONIZE === 'true', // Set to false in production
    LOGGING: process.env.DB_LOGGING === 'true',
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-please-change-me',
    EXPIRATION_TIME: process.env.JWT_EXPIRATION_TIME || '1h',
  },
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3001',
  THROTTLE_TTL: parseInt(process.env.THROTTLE_TTL || '60', 10), // seconds
  THROTTLE_LIMIT: parseInt(process.env.THROTTLE_LIMIT || '100', 10), // requests per TTL
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  CACHE_TTL: parseInt(process.env.CACHE_TTL || '300000', 10), // milliseconds (5 minutes)
});
```
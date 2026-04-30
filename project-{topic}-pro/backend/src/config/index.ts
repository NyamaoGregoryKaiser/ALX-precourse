```typescript
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

export const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        username: process.env.DB_USERNAME || 'admin',
        password: process.env.DB_PASSWORD || 'admin_password',
        database: process.env.DB_DATABASE || 'task_manager_db',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key_please_change_this_in_production',
        expirationTime: process.env.JWT_EXPIRATION_TIME || '1h',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
        cacheTTLSeconds: process.env.REDIS_CACHE_TTL_SECONDS ? parseInt(process.env.REDIS_CACHE_TTL_SECONDS, 10) : 3600, // 1 hour
    },
    logLevel: process.env.LOG_LEVEL || 'info' // debug, info, warn, error
};

// Validate essential configurations
if (!config.jwt.secret) {
    throw new Error('FATAL ERROR: JWT_SECRET is not defined.');
}
if (!config.database.host || !config.database.username || !config.database.password || !config.database.database) {
    throw new Error('FATAL ERROR: Database configuration incomplete.');
}
```
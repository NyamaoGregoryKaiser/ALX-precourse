import dotenv from 'dotenv';
dotenv.config();

const config = {
    server: {
        port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
        env: process.env.NODE_ENV || 'development',
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        username: process.env.DB_USERNAME || 'user',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_DATABASE || 'task_db',
        sync: process.env.DB_SYNC === 'true', // Use with caution in production
        logging: process.env.DB_LOGGING === 'true',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'supersecretjwtkeyforalx',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379,
    },
    client: {
        url: process.env.CLIENT_URL || 'http://localhost:3000',
    },
    rateLimit: {
        windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 15 * 60 * 1000, // 15 minutes
        maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : 100, // max 100 requests per windowMs
    }
};

export default config;
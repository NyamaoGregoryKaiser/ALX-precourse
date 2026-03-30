import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
dotenv.config({ path: resolve(__dirname, '../../.env') });

const getConfig = () => ({
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        name: process.env.DB_NAME || 'scrapeflow_db',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'super_secret_jwt_key_default',
        expirationTime: process.env.JWT_EXPIRATION_TIME || '1h',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 requests
    },
    bullmq: {
        queueName: process.env.BULLMQ_QUEUE_NAME || 'scrapeflow-jobs',
        workerConcurrency: parseInt(process.env.BULLMQ_WORKER_CONCURRENCY || '5', 10),
    },
});

export const config = getConfig();
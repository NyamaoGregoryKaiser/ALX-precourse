import Redis from 'ioredis';
import * as dotenv from 'dotenv';
import logger from './logger';

// Load environment variables
dotenv.config({ path: __dirname + '/../../.env' });
dotenv.config({ path: __dirname + '/../.env', override: true });

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

const redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    maxRetriesPerRequest: null, // Unlimited retries for connection attempts
    reconnectOnError: (err) => {
        logger.error(`Redis reconnectOnError: ${err.message}`);
        // Only reconnect if the error is due to connection issues
        const targetErrors = [/READONLY/, /ETIMEDOUT/, /ECONNREFUSED/];
        targetErrors.forEach((targetError) => {
            if (targetError.test(err.message)) {
                return true;
            }
        });
        return false;
    },
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000); // Exponential backoff up to 2 seconds
        logger.warn(`Redis: Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
    },
});

redisClient.on('connect', () => {
    logger.info(`Redis client connected to ${redisHost}:${redisPort}`);
});

redisClient.on('error', (err) => {
    logger.error('Redis client error:', err);
});

redisClient.on('ready', () => {
    logger.info('Redis client is ready to use.');
});

redisClient.on('end', () => {
    logger.info('Redis client connection closed.');
});

export default redisClient;
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../services/cache.service';
import { logger } from '../services/logger.service';
import { AppError } from '../utils/appError';

// Configure Redis store
const redisStore = new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    // Pass the client directly to the store
    // @ts-ignore - 'client' is deprecated but still supported by rate-limit-redis
    client: redisClient,
});

export const rateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: redisStore, // Use the Redis store
    message: async (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        throw new AppError('Too many requests from this IP, please try again after 15 minutes.', 429);
    },
    handler: (req, res, next, options) => {
        // The default handler just sends the message
        // We're using a custom message handler that throws an AppError
        // This ensures our global error handler catches it
        if (options.message instanceof Error) {
            next(options.message);
        } else {
            next(new AppError(options.message as string, 429));
        }
    },
});

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Allow only 5 requests per IP every 15 minutes for auth endpoints
    store: redisStore,
    message: async (req, res) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        throw new AppError('Too many authentication attempts from this IP, please try again after 15 minutes.', 429);
    },
    handler: (req, res, next, options) => {
        if (options.message instanceof Error) {
            next(options.message);
        } else {
            next(new AppError(options.message as string, 429));
        }
    },
});
```
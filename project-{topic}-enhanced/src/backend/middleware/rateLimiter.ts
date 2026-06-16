import { rateLimit } from 'express-rate-limit';
import config from '../config';
import { logger } from '../utils/logger';

export const apiRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 15 minutes by default
    max: config.rateLimit.maxRequests,   // Limit each IP to 100 requests per window by default
    message: 'Too many requests, please try again later.',
    statusCode: 429, // 429 Too Many Requests
    headers: true,   // Return rate limit info in the `RateLimit-*` headers
    // Optional: store rate limit info in Redis if scaling beyond one instance
    // store: new RedisStore({
    //     client: redisClient,
    //     expiry: config.rateLimit.windowMs / 1000, // seconds
    // }),
    handler: (req, res, next, options) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    },
    keyGenerator: (req) => req.ip || '', // Use IP address to identify clients
});

// Example of a stricter rate limiter for sensitive routes like login/register
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 login attempts per IP per 15 minutes
    message: 'Too many login attempts from this IP, please try again after 15 minutes.',
    statusCode: 429,
    headers: true,
    handler: (req, res, next, options) => {
        logger.warn(`Auth rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).send(options.message);
    },
});
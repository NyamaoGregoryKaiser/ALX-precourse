import { rateLimit } from 'express-rate-limit';
import * as dotenv from 'dotenv';
import logger from '../config/logger';
import { CustomError } from './errorHandler';

dotenv.config({ path: __dirname + '/../../.env' });
dotenv.config({ path: __dirname + '/../.env', override: true });

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10); // 100 requests

export const apiRateLimiter = rateLimit({
    windowMs: windowMs,
    max: maxRequests,
    message: async (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip} on path: ${req.path}`);
        throw new CustomError('Too many requests, please try again later.', 429, 'TOO_MANY_REQUESTS');
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    handler: (req, res, next, options) => {
        // This handler will be called if the message function throws an error.
        // It's a fallback or for custom response formatting.
        next(new CustomError(
            options.message as string || 'Too many requests, please try again later.',
            options.statusCode,
            'TOO_MANY_REQUESTS'
        ));
    },
});

// Example for a stricter login rate limiter
export const loginRateLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // 5 login attempts per 5 minutes per IP
    message: async (req, res) => {
        logger.warn(`Login rate limit exceeded for IP: ${req.ip}`);
        throw new CustomError('Too many login attempts from this IP, please try again after 5 minutes.', 429, 'TOO_MANY_LOGIN_ATTEMPTS');
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        next(new CustomError(
            options.message as string || 'Too many login attempts, please try again later.',
            options.statusCode,
            'TOO_MANY_LOGIN_ATTEMPTS'
        ));
    },
});
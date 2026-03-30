import rateLimit from 'express-rate-limit';
import RedisStore from 'express-rate-limit-redis';
import { config } from '../config';
import { RedisService } from '../services/cache'; // Re-use Redis client

export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute
  max: config.rateLimit.maxRequests, // Max requests per windowMs per IP
  message: 'Too many requests from this IP, please try again after a minute.',
  store: new RedisStore({
    sendCommand: (...args: string[]) => RedisService.getClient().sendCommand(args),
    // prefix: 'rate-limit:', // Optional: prefix for Redis keys
  }),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
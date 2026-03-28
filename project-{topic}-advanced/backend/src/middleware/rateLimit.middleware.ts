import rateLimit from 'express-rate-limit';
import { logger } from '../utils/logger.util';

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: async (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.originalUrl}`);
    res.status(429).json({
      message: 'Too many requests, please try again after 15 minutes.',
    });
  },
  // store: new RedisStore({ client: redisClient, prefix: 'rate_limit:' }), // Optional: Use Redis for distributed rate limiting
});
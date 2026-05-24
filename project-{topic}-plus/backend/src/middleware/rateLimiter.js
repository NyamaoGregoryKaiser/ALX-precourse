```javascript
const rateLimit = require('express-rate-limit');
const { config } = require('../config/config');
const redis = require('../utils/redisClient');
const RedisStore = require('connect-redis').Store; // Using connect-redis for rate limit store

const redisStore = new RedisStore({
  client: redis,
  prefix: 'rl:', // Prefix for rate limit keys in Redis
  ttl: config.rateLimit.windowMs / 1000, // TTL in seconds
});

const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 1 minute
  max: config.rateLimit.maxRequests, // Max 100 requests per minute per IP
  message: 'Too many requests from this IP, please try again after a minute',
  store: redisStore, // Use Redis to store hit counts
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    // Use x-forwarded-for if behind a proxy
    return req.headers['x-forwarded-for'] || req.ip;
  },
  handler: (req, res, next, options) => {
    // Custom handler for when rate limit is exceeded
    res.status(options.statusCode).send({
      message: options.message,
      code: options.statusCode,
    });
  },
});

module.exports = apiRateLimiter;
```
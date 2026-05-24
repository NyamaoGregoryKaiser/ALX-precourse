import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many authentication requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn(`API Rate limit exceeded for IP: ${req.ip} on route: ${req.originalUrl}`);
    res.status(options.statusCode).send(options.message);
  },
});

export { authLimiter, apiLimiter };
```

```javascript
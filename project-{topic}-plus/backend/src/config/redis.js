```javascript
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
require('dotenv').config({ path: '.env' });

module.exports = {
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: process.env.REDIS_PORT || 6379,
  redisCacheTTL: parseInt(process.env.REDIS_CACHE_TTL || '3600', 10), // in seconds
};
```
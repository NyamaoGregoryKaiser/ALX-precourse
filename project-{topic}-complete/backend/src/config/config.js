```javascript
require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5000,
    apiVersion: process.env.API_VERSION || '/api/v1',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000', // Example
    jwt: {
        secret: process.env.JWT_SECRET || 'supersecretjwtkeythatshouldbeverylongandcomplex',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h'
    },
    db: {
        dialect: process.env.DB_DIALECT || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'ecommerce_user',
        password: process.env.DB_PASSWORD || 'ecommerce_password',
        name: process.env.DB_NAME || 'ecommerce_db',
        testName: process.env.DB_TEST_NAME || 'ecommerce_test_db',
        logging: process.env.DB_LOGGING === 'true' // Enable/disable SQL logging
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10) // max 100 requests per window
    },
    cache: {
        ttlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10) // 1 hour
    }
};

module.exports = config;
```
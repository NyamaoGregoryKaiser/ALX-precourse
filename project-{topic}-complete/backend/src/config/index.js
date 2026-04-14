```javascript
require('dotenv').config({ path: '../.env' }); // Adjust path as needed for local dev

const config = {
    port: process.env.PORT || 8000,
    env: process.env.NODE_ENV || 'development',
    database: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'scraper_user',
            password: process.env.DB_PASSWORD || 'scraper_password',
            database: process.env.DB_NAME || 'scraper_db',
            port: process.env.DB_PORT || 5432,
        },
        pool: {
            min: 2,
            max: 10,
        },
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'supersecretjwtkeyforprod', // CHANGE IN PROD!
        accessExpirationMinutes: process.env.JWT_ACCESS_EXPIRATION_MINUTES || 60,
        refreshExpirationDays: process.env.JWT_REFRESH_EXPIRATION_DAYS || 30,
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    },
    adminEmail: process.env.ADMIN_EMAIL || 'admin@example.com',
    adminPassword: process.env.ADMIN_PASSWORD || 'adminpassword', // CHANGE IN PROD!
    scraperConcurrency: parseInt(process.env.SCRAPER_CONCURRENCY || '5', 10),
};

module.exports = config;
```
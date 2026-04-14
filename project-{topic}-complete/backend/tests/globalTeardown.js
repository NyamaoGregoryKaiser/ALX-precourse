```javascript
const db = require('../src/db');
const { redisClient } = require('../src/middleware/cache.middleware');
const scraperService = require('../src/services/scraper.service');

module.exports = async () => {
    // Close database connection
    if (db) {
        await db.destroy();
        console.log('Database connection closed.');
    }

    // Close Redis connection
    if (redisClient && redisClient.isReady) {
        await redisClient.disconnect();
        console.log('Redis client disconnected.');
    }

    // Close Puppeteer browser if running
    await scraperService.closeBrowser();
};
```
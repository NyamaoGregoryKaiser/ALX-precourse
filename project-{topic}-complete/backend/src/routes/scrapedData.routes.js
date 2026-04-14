```javascript
const express = require('express');
const scrapedDataController = require('../controllers/scrapedData.controller');
const { verifyToken } = require('../middleware/auth.middleware');
const { cacheMiddleware } = require('../middleware/cache.middleware');

const router = express.Router();

router.use(verifyToken); // All scraped data routes require authentication

router.get('/jobs/:jobId/data', cacheMiddleware(300), scrapedDataController.getScrapedDataForJob); // Cache for 5 minutes
router.get('/jobs/:jobId/logs', cacheMiddleware(60), scrapedDataController.getJobLogs); // Cache for 1 minute

module.exports = router;
```
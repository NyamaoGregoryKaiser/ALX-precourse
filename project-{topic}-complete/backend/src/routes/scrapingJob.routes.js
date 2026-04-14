```javascript
const express = require('express');
const scrapingJobController = require('../controllers/scrapingJob.controller');
const { verifyToken, authorize } = require('../middleware/auth.middleware');
const { cacheMiddleware } = require('../middleware/cache.middleware');

const router = express.Router();

router.use(verifyToken); // All scraping job routes require authentication

router
    .route('/')
    .post(scrapingJobController.createScrapingJob)
    .get(cacheMiddleware(60), scrapingJobController.getScrapingJobs); // Cache for 60 seconds

router
    .route('/:jobId')
    .get(scrapingJobController.getScrapingJob)
    .patch(scrapingJobController.updateScrapingJob)
    .delete(scrapingJobController.deleteScrapingJob);

router.post('/:jobId/run', scrapingJobController.runScrapingJobNow);

module.exports = router;
```
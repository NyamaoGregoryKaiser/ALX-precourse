const express = require('express');
const {
  createScrapingJob,
  getScrapingJobs,
  getScrapingJobById,
  getScrapedResults,
  getScrapedResultById,
  deleteScrapedResult,
  cancelScrapingJob,
} = require('../controllers/scrapeController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { commonLimiter } = require('../middleware/rateLimit');
const { cacheMiddleware, clearCache } = require('../middleware/cacheMiddleware');
const { cache } = require('../config/cache');

const router = express.Router();

// Apply common rate limiting to all scraping routes
router.use(commonLimiter);
router.use(protect); // All routes below this require authentication

// Scrape Jobs
router.post('/scrape', createScrapingJob);
router.get('/jobs', cacheMiddleware(parseInt(process.env.CACHE_TTL_SECONDS || '300', 10)), getScrapingJobs);
router.get('/jobs/:id', getScrapingJobById);
router.put('/jobs/:id/cancel', authorize('USER', 'ADMIN'), cancelScrapingJob);

// Scraped Results
router.get('/results', cacheMiddleware(parseInt(process.env.CACHE_TTL_SECONDS || '300', 10)), getScrapedResults);
router.get('/results/:id', getScrapedResultById);
router.delete('/results/:id', authorize('USER', 'ADMIN'), deleteScrapedResult);


module.exports = router;
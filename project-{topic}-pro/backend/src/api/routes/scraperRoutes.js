const express = require('express');
const scraperController = require('../controllers/scraperController');
const scraperValidator = require('../validators/scraperValidator');
const auth = require('../../middlewares/authMiddleware');
const { clearCache } = require('../../middlewares/cacheMiddleware'); // Import clearCache

const router = express.Router();

router.route('/')
  .post(auth, clearCache, scraperValidator.validateCreateScraper, scraperController.createScraper)
  .get(auth, scraperController.getScrapers);

router.route('/:scraperId')
  .get(auth, scraperController.getScraper)
  .patch(auth, clearCache, scraperValidator.validateUpdateScraper, scraperController.updateScraper)
  .delete(auth, clearCache, scraperController.deleteScraper);

router.post('/:scraperId/trigger', auth, scraperController.triggerScrape);
router.get('/:scraperId/jobs', auth, scraperController.getScraperJobs);
router.get('/:scraperId/items', auth, scraperController.getScraperItems);


module.exports = router;
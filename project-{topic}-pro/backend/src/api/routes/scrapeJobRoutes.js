const express = require('express');
const scrapeJobController = require('../controllers/scrapeJobController');
const auth = require('../../middlewares/authMiddleware');

const router = express.Router();

router.get('/:jobId', auth, scrapeJobController.getJobDetails);
router.get('/:jobId/items', auth, scrapeJobController.getJobItems);

module.exports = router;
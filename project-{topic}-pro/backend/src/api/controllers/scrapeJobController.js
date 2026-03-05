const httpStatus = require('http-status');
const scrapeJobService = require('../../services/scrapeJobService');
const scraperService = require('../../services/scraperService'); // To check scraper ownership
const catchAsync = require('../../utils/catchAsync');
const { ApiError } = require('../../middlewares/errorMiddleware');

const getJobDetails = catchAsync(async (req, res) => {
  const job = await scrapeJobService.getJobById(req.params.jobId);
  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Scrape job not found');
  }

  // Verify user owns the scraper associated with this job
  const scraper = await scraperService.getScraperById(job.scraper_id, req.user.id);
  // getScraperById will throw NOT_FOUND if not found or not owned by user

  res.send(job);
});

const getJobItems = catchAsync(async (req, res) => {
  const job = await scrapeJobService.getJobById(req.params.jobId);
  if (!job) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Scrape job not found');
  }

  // Verify user owns the scraper associated with this job
  const scraper = await scraperService.getScraperById(job.scraper_id, req.user.id);
  // getScraperById will throw NOT_FOUND if not found or not owned by user

  const items = await scrapeJobService.getItemsByJobId(job.id);
  res.send(items);
});


module.exports = {
  getJobDetails,
  getJobItems,
};
const httpStatus = require('http-status');
const scraperService = require('../../services/scraperService');
const scrapeJobService = require('../../services/scrapeJobService'); // For job details
const scrapedItemService = require('../../services/scrapedItemService'); // For scraped data
const catchAsync = require('../../utils/catchAsync');
const { ApiError } = require('../../middlewares/errorMiddleware');

const createScraper = catchAsync(async (req, res) => {
  const scraper = await scraperService.createScraper(req.user.id, req.body);
  res.status(httpStatus.CREATED).send(scraper);
});

const getScrapers = catchAsync(async (req, res) => {
  const scrapers = await scraperService.getScrapersByUser(req.user.id);
  res.send(scrapers);
});

const getScraper = catchAsync(async (req, res) => {
  const scraper = await scraperService.getScraperById(req.params.scraperId, req.user.id);
  res.send(scraper);
});

const updateScraper = catchAsync(async (req, res) => {
  const scraper = await scraperService.updateScraper(req.params.scraperId, req.user.id, req.body);
  res.send(scraper);
});

const deleteScraper = catchAsync(async (req, res) => {
  await scraperService.deleteScraper(req.params.scraperId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const triggerScrape = catchAsync(async (req, res) => {
  const jobId = await scraperService.triggerScrapeJob(req.params.scraperId, req.user.id);
  res.status(httpStatus.ACCEPTED).send({ message: 'Scrape job queued successfully', jobId });
});

const getScraperJobs = catchAsync(async (req, res) => {
  const scraper = await scraperService.getScraperById(req.params.scraperId, req.user.id); // Check ownership
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const { jobs, total } = await scrapeJobService.getJobsByScraperId(scraper.id, page, limit);
  res.send({ page, limit, total, jobs });
});

const getScraperItems = catchAsync(async (req, res) => {
  const scraper = await scraperService.getScraperById(req.params.scraperId, req.user.id); // Check ownership
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const { items, total } = await scrapedItemService.getItemsByScraperId(scraper.id, page, limit);
  res.send({ page, limit, total, items });
});


module.exports = {
  createScraper,
  getScrapers,
  getScraper,
  updateScraper,
  deleteScraper,
  triggerScrape,
  getScraperJobs,
  getScraperItems,
};
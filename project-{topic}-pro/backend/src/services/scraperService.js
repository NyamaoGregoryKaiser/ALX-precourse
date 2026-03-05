const httpStatus = require('http-status');
const Scraper = require('../database/models/Scraper');
const { ApiError } = require('../middlewares/errorMiddleware');
const logger = require('../utils/logger');
const { scrapeQueue } = require('../jobs/queue');

const createScraper = async (userId, scraperBody) => {
  const newScraper = await Scraper.create({ user_id: userId, ...scraperBody });
  logger.info(`Scraper created by user ${userId}: ${newScraper.name}`);
  return newScraper;
};

const getScrapersByUser = async (userId) => {
  return Scraper.findByUserId(userId);
};

const getScraperById = async (scraperId, userId) => {
  const scraper = await Scraper.findById(scraperId);
  if (!scraper || scraper.user_id !== userId) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Scraper not found');
  }
  return scraper;
};

const updateScraper = async (scraperId, userId, updateBody) => {
  const scraper = await getScraperById(scraperId, userId); // Ensures ownership check
  const updatedScraper = await Scraper.update(scraper.id, updateBody);
  logger.info(`Scraper updated by user ${userId}: ${updatedScraper.name}`);
  return updatedScraper;
};

const deleteScraper = async (scraperId, userId) => {
  const scraper = await getScraperById(scraperId, userId); // Ensures ownership check
  await Scraper.delete(scraper.id);
  logger.info(`Scraper deleted by user ${userId}: ${scraper.name}`);
};

const triggerScrapeJob = async (scraperId, userId) => {
  const scraper = await getScraperById(scraperId, userId); // Ensures ownership check
  const job = await scrapeQueue.add('scrape-task', { scraperId: scraper.id, startUrl: scraper.start_url });
  logger.info(`Scrape job #${job.id} triggered for scraper ${scraper.name}`);
  return job.id;
};

module.exports = {
  createScraper,
  getScrapersByUser,
  getScraperById,
  updateScraper,
  deleteScraper,
  triggerScrapeJob,
};
const ScrapeJob = require('../database/models/ScrapeJob');
const ScrapedItem = require('../database/models/ScrapedItem');
const logger = require('../utils/logger');

const getJobById = async (jobId) => {
  return ScrapeJob.findById(jobId);
};

const getJobsByScraperId = async (scraperId, page, limit) => {
  return ScrapeJob.findByScraperId(scraperId, page, limit);
};

const getItemsByJobId = async (jobId) => {
  return ScrapedItem.findByJobId(jobId);
};

module.exports = {
  getJobById,
  getJobsByScraperId,
  getItemsByJobId,
};
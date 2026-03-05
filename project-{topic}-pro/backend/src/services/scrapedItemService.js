const ScrapedItem = require('../database/models/ScrapedItem');
const logger = require('../utils/logger');

const getItemsByScraperId = async (scraperId, page, limit) => {
  return ScrapedItem.findByScraperId(scraperId, page, limit);
};

module.exports = {
  getItemsByScraperId,
};
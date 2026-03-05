const db = require('../connection');

class ScrapedItem {
  static async create(itemData) {
    const [item] = await db('scraped_items').insert(itemData).returning('*');
    return item;
  }

  static async bulkCreate(itemsData) {
    if (itemsData.length === 0) return [];
    return db('scraped_items').insert(itemsData).returning('*');
  }

  static async findByJobId(jobId) {
    return db('scraped_items').where({ job_id: jobId }).select('*');
  }

  static async findByScraperId(scraperId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const items = await db('scraped_items')
      .where({ scraper_id: scraperId })
      .orderBy('scraped_at', 'desc')
      .limit(limit)
      .offset(offset);
    const total = await db('scraped_items').where({ scraper_id: scraperId }).count('id as count').first();
    return { items, total: parseInt(total.count, 10) };
  }
}

module.exports = ScrapedItem;
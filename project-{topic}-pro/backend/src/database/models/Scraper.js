const db = require('../connection');

class Scraper {
  static async create(scraperData) {
    const [scraper] = await db('scrapers').insert(scraperData).returning('*');
    return scraper;
  }

  static async findById(id) {
    return db('scrapers').where({ id }).first();
  }

  static async findByUserId(userId) {
    return db('scrapers').where({ user_id: userId }).select('*');
  }

  static async update(id, scraperData) {
    const [updatedScraper] = await db('scrapers')
      .where({ id })
      .update({ ...scraperData, updated_at: db.fn.now() })
      .returning('*');
    return updatedScraper;
  }

  static async delete(id) {
    return db('scrapers').where({ id }).del();
  }

  static async updateLastRun(id) {
    await db('scrapers').where({ id }).update({ last_run: db.fn.now() });
  }

  static async getActiveScrapers() {
    return db('scrapers').where({ is_active: true }).select('*');
  }
}

module.exports = Scraper;
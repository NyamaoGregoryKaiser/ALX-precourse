const db = require('../connection');

class ScrapeJob {
  static async create(jobData) {
    const [job] = await db('scrape_jobs').insert(jobData).returning('*');
    return job;
  }

  static async findById(id) {
    return db('scrape_jobs').where({ id }).first();
  }

  static async findByScraperId(scraperId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    const jobs = await db('scrape_jobs')
      .where({ scraper_id: scraperId })
      .orderBy('start_time', 'desc')
      .limit(limit)
      .offset(offset);
    const total = await db('scrape_jobs').where({ scraper_id: scraperId }).count('id as count').first();
    return { jobs, total: parseInt(total.count, 10) };
  }

  static async update(id, updateData) {
    const [updatedJob] = await db('scrape_jobs')
      .where({ id })
      .update(updateData)
      .returning('*');
    return updatedJob;
  }
}

module.exports = ScrapeJob;
```javascript
const db = require('../db');

class ScrapedData {
    static table = 'scraped_data';

    static async create(jobId, url, data) {
        const [scraped] = await db(ScrapedData.table).insert({
            job_id: jobId,
            url,
            data: JSON.stringify(data),
        }, ['id', 'url', 'data', 'scraped_at']);
        return scraped;
    }

    static async findByJobId(jobId, limit = 100, offset = 0) {
        return db(ScrapedData.table).where({ job_id: jobId }).limit(limit).offset(offset).orderBy('scraped_at', 'desc');
    }

    static async countByJobId(jobId) {
        const result = await db(ScrapedData.table).where({ job_id: jobId }).count('id as count').first();
        return parseInt(result.count, 10);
    }

    static async deleteByJobId(jobId) {
        return db(ScrapedData.table).where({ job_id: jobId }).del();
    }
}

module.exports = ScrapedData;
```
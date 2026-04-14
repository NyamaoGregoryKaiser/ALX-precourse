```javascript
const db = require('../db');

class ScrapingJob {
    static table = 'scraping_jobs';

    static async create(userId, name, startUrl, selectors, scrapeType, scheduleCron, isActive = true) {
        const [job] = await db(ScrapingJob.table).insert({
            user_id: userId,
            name,
            start_url: startUrl,
            selectors: JSON.stringify(selectors),
            scrape_type: scrapeType,
            schedule_cron: scheduleCron,
            is_active: isActive,
            status: 'pending',
        }, ['id', 'name', 'start_url', 'selectors', 'scrape_type', 'schedule_cron', 'is_active', 'status', 'created_at']);
        return job;
    }

    static async findById(id) {
        return db(ScrapingJob.table).where({ id }).first();
    }

    static async findByUserId(userId) {
        return db(ScrapingJob.table).where({ user_id: userId }).orderBy('created_at', 'desc');
    }

    static async findAllActiveScheduledJobs() {
        return db(ScrapingJob.table)
            .where({ is_active: true })
            .whereNotNull('schedule_cron')
            .andWhere((builder) => {
                builder.whereNull('next_run').orWhere('next_run', '<=', db.fn.now());
            });
    }

    static async update(id, data) {
        const updateData = { ...data, updated_at: db.fn.now() };
        if (updateData.selectors) {
            updateData.selectors = JSON.stringify(updateData.selectors);
        }
        await db(ScrapingJob.table).where({ id }).update(updateData);
        return this.findById(id);
    }

    static async delete(id) {
        return db(ScrapingJob.table).where({ id }).del();
    }

    static async updateJobStatus(id, status, lastRun = null, nextRun = null) {
        const updateData = { status, updated_at: db.fn.now() };
        if (lastRun) updateData.last_run = lastRun;
        if (nextRun) updateData.next_run = nextRun;
        return db(ScrapingJob.table).where({ id }).update(updateData);
    }

    static async logJob(jobId, level, message) {
        return db('job_logs').insert({ job_id: jobId, level, message });
    }
}

module.exports = ScrapingJob;
```
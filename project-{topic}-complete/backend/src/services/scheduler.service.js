```javascript
const cron = require('node-cron');
const ScrapingJob = require('../models/scrapingJob.model');
const scraperService = require('./scraper.service');
const logger = require('../config/logger');

class SchedulerService {
    constructor() {
        this.scheduledJobs = new Map(); // Stores cron job instances
    }

    async start() {
        logger.info('Scheduler service started. Loading active jobs...');
        await this.loadAllActiveJobs();
        // Schedule a job to re-evaluate active jobs periodically (e.g., every hour)
        cron.schedule('0 * * * *', this.loadAllActiveJobs.bind(this));
    }

    async loadAllActiveJobs() {
        logger.debug('Loading all active and scheduled jobs...');
        try {
            const jobs = await ScrapingJob.findAllActiveScheduledJobs();
            const activeJobIds = new Set();

            for (const job of jobs) {
                activeJobIds.add(job.id);
                if (!this.scheduledJobs.has(job.id)) {
                    this.addJob(job);
                } else {
                    // Check if schedule_cron changed, if so, re-add
                    const currentCron = this.scheduledJobs.get(job.id).cronExpression;
                    if (currentCron !== job.schedule_cron) {
                        this.removeJob(job.id);
                        this.addJob(job);
                        logger.info(`Rescheduled job ${job.id} due to schedule change.`);
                    }
                }
            }

            // Remove jobs that are no longer active or scheduled
            for (const [jobId, jobInstance] of this.scheduledJobs.entries()) {
                if (!activeJobIds.has(jobId)) {
                    jobInstance.stop();
                    this.scheduledJobs.delete(jobId);
                    logger.info(`Removed inactive/unscheduled job ${jobId} from scheduler.`);
                }
            }
            logger.info(`Scheduler: ${this.scheduledJobs.size} jobs currently scheduled.`);
        } catch (error) {
            logger.error('Error loading active jobs for scheduler:', error.message);
        }
    }

    addJob(job) {
        if (!job.schedule_cron || !job.is_active) {
            logger.debug(`Job ${job.id} is not active or has no schedule, skipping.`);
            return;
        }

        if (!cron.validate(job.schedule_cron)) {
            logger.error(`Invalid cron schedule for job ${job.id}: ${job.schedule_cron}`);
            ScrapingJob.logJob(job.id, 'error', `Invalid cron schedule: ${job.schedule_cron}`).catch(err => logger.error(`Failed to log error for job ${job.id}: ${err.message}`));
            return;
        }

        const task = cron.schedule(job.schedule_cron, async () => {
            logger.info(`Scheduled task for job ${job.id} is running.`);
            try {
                // Update job status to scheduled and calculate next run
                const nextRunTime = cron.validate(job.schedule_cron) ? cron.sendAt(job.schedule_cron).toISOString() : null;
                await ScrapingJob.updateJobStatus(job.id, 'scheduled', null, nextRunTime);
                scraperService.enqueueScrape(job);
            } catch (error) {
                logger.error(`Error in scheduled job ${job.id}: ${error.message}`);
                await ScrapingJob.logJob(job.id, 'error', `Scheduled task failed: ${error.message}`);
            }
        }, {
            scheduled: true,
            timezone: "Etc/UTC" // Use UTC to avoid timezone issues
        });

        const nextRun = cron.sendAt(job.schedule_cron);
        ScrapingJob.updateJobStatus(job.id, 'scheduled', null, nextRun.toISOString())
            .then(() => logger.info(`Job ${job.id} (${job.name}) scheduled to run with cron: ${job.schedule_cron}. Next run: ${nextRun}`))
            .catch(err => logger.error(`Failed to update next_run for job ${job.id}: ${err.message}`));

        this.scheduledJobs.set(job.id, { instance: task, cronExpression: job.schedule_cron });
    }

    removeJob(jobId) {
        if (this.scheduledJobs.has(jobId)) {
            this.scheduledJobs.get(jobId).instance.stop();
            this.scheduledJobs.delete(jobId);
            logger.info(`Job ${jobId} removed from scheduler.`);
        }
    }

    updateJob(job) {
        // If job exists, remove and re-add. Otherwise, just add.
        this.removeJob(job.id);
        this.addJob(job);
    }

    async stop() {
        logger.info('Stopping scheduler service...');
        for (const [jobId, jobInstance] of this.scheduledJobs.entries()) {
            jobInstance.instance.stop();
            logger.debug(`Stopped scheduled job ${jobId}`);
        }
        this.scheduledJobs.clear();
        await scraperService.closeBrowser(); // Close puppeteer browser
        logger.info('Scheduler service stopped.');
    }
}

module.exports = new SchedulerService();
```
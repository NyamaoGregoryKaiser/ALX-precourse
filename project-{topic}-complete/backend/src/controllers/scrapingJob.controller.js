```javascript
const httpStatus = require('http-status');
const ScrapingJob = require('../models/scrapingJob.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const scraperService = require('../services/scraper.service');
const schedulerService = require('../services/scheduler.service');

const createScrapingJob = asyncHandler(async (req, res) => {
    const { name, start_url, selectors, scrape_type, schedule_cron, is_active } = req.body;
    const userId = req.user.id;

    if (!name || !start_url || !selectors || !scrape_type) {
        throw new AppError(httpStatus.BAD_REQUEST, 'Missing required fields: name, start_url, selectors, scrape_type');
    }

    const job = await ScrapingJob.create(userId, name, start_url, selectors, scrape_type, schedule_cron, is_active);

    if (job.is_active && job.schedule_cron) {
        schedulerService.addJob(job);
    }

    res.status(httpStatus.CREATED).send(new ApiResponse(httpStatus.CREATED, job, 'Scraping job created successfully'));
});

const getScrapingJobs = asyncHandler(async (req, res) => {
    let jobs;
    if (req.user.role === 'admin') {
        jobs = await db('scraping_jobs').select('*'); // Admin can see all jobs
    } else {
        jobs = await ScrapingJob.findByUserId(req.user.id);
    }
    // Ensure selectors are parsed
    jobs = jobs.map(job => ({
        ...job,
        selectors: typeof job.selectors === 'string' ? JSON.parse(job.selectors) : job.selectors,
    }));
    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, jobs, 'Scraping jobs retrieved successfully'));
});

const getScrapingJob = asyncHandler(async (req, res) => {
    const job = await ScrapingJob.findById(req.params.jobId);
    if (!job) {
        throw new AppError(httpStatus.NOT_FOUND, 'Scraping job not found');
    }
    // Check ownership for non-admin users
    if (req.user.role !== 'admin' && job.user_id !== req.user.id) {
        throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to access this job');
    }
    job.selectors = typeof job.selectors === 'string' ? JSON.parse(job.selectors) : job.selectors;
    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, job, 'Scraping job retrieved successfully'));
});

const updateScrapingJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const updateBody = req.body;

    const job = await ScrapingJob.findById(jobId);
    if (!job) {
        throw new AppError(httpStatus.NOT_FOUND, 'Scraping job not found');
    }
    if (req.user.role !== 'admin' && job.user_id !== req.user.id) {
        throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to update this job');
    }

    const updatedJob = await ScrapingJob.update(jobId, updateBody);
    if (updatedJob.is_active && updatedJob.schedule_cron) {
        schedulerService.updateJob(updatedJob);
    } else {
        schedulerService.removeJob(updatedJob.id);
    }
    updatedJob.selectors = typeof updatedJob.selectors === 'string' ? JSON.parse(updatedJob.selectors) : updatedJob.selectors;
    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, updatedJob, 'Scraping job updated successfully'));
});

const deleteScrapingJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const job = await ScrapingJob.findById(jobId);
    if (!job) {
        throw new AppError(httpStatus.NOT_FOUND, 'Scraping job not found');
    }
    if (req.user.role !== 'admin' && job.user_id !== req.user.id) {
        throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to delete this job');
    }

    await ScrapingJob.delete(jobId);
    schedulerService.removeJob(jobId); // Also remove from scheduler
    await db('scraped_data').where({ job_id: jobId }).del(); // Delete associated scraped data
    await db('job_logs').where({ job_id: jobId }).del(); // Delete associated logs

    res.status(httpStatus.NO_CONTENT).send(new ApiResponse(httpStatus.NO_CONTENT, null, 'Scraping job deleted successfully'));
});

const runScrapingJobNow = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const job = await ScrapingJob.findById(jobId);
    if (!job) {
        throw new AppError(httpStatus.NOT_FOUND, 'Scraping job not found');
    }
    if (req.user.role !== 'admin' && job.user_id !== req.user.id) {
        throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to run this job');
    }

    // Enqueue the job for immediate scraping
    await ScrapingJob.logJob(job.id, 'info', 'Manually triggered scrape.');
    scraperService.enqueueScrape(job);

    res.status(httpStatus.ACCEPTED).send(new ApiResponse(httpStatus.ACCEPTED, null, 'Scraping job enqueued for immediate execution'));
});

module.exports = {
    createScrapingJob,
    getScrapingJobs,
    getScrapingJob,
    updateScrapingJob,
    deleteScrapingJob,
    runScrapingJobNow,
};
```
```javascript
const httpStatus = require('http-status');
const ScrapedData = require('../models/scrapedData.model');
const ScrapingJob = require('../models/scrapingJob.model');
const AppError = require('../utils/AppError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

const getScrapedDataForJob = asyncHandler(async (req, res) => {
    const { jobId } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const job = await ScrapingJob.findById(jobId);
    if (!job) {
        throw new AppError(httpStatus.NOT_FOUND, 'Scraping job not found');
    }
    // Check ownership for non-admin users
    if (req.user.role !== 'admin' && job.user_id !== req.user.id) {
        throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to access data for this job');
    }

    const data = await ScrapedData.findByJobId(jobId, parseInt(limit), parseInt(offset));
    const total = await ScrapedData.countByJobId(jobId);

    // Ensure data is parsed from JSONB string
    const parsedData = data.map(item => ({
        ...item,
        data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data,
    }));

    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, { data: parsedData, total }, 'Scraped data retrieved successfully'));
});

const getJobLogs = asyncHandler(async (req, res) => {
    const { jobId } = req.params;

    const job = await ScrapingJob.findById(jobId);
    if (!job) {
        throw new AppError(httpStatus.NOT_FOUND, 'Scraping job not found');
    }
    // Check ownership for non-admin users
    if (req.user.role !== 'admin' && job.user_id !== req.user.id) {
        throw new AppError(httpStatus.FORBIDDEN, 'You do not have permission to access logs for this job');
    }

    const logs = await db('job_logs').where({ job_id: jobId }).orderBy('timestamp', 'desc');
    res.status(httpStatus.OK).send(new ApiResponse(httpStatus.OK, logs, 'Job logs retrieved successfully'));
});


module.exports = {
    getScrapedDataForJob,
    getJobLogs,
};
```
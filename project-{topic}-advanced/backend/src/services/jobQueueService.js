const { prisma } = require('../config/db');
const { logger } = require('../config/logger');
const { scrapeUrl, saveScrapedData } = require('./scrapingService');

// In-memory queue for scraping jobs (for production, use Redis/RabbitMQ)
const jobQueue = [];
let isProcessing = false;

/**
 * Adds a new job to the queue.
 * @param {Object} job - The job object to add.
 */
const addJobToQueue = (job) => {
  jobQueue.push(job);
  logger.info(`Job ${job.id} added to queue. Queue size: ${jobQueue.length}`);
};

/**
 * Processes jobs from the queue.
 */
const processNextJob = async () => {
  if (isProcessing || jobQueue.length === 0) {
    return;
  }

  isProcessing = true;
  const job = jobQueue.shift(); // Get the next job from the front of the queue

  if (!job) {
    isProcessing = false;
    return;
  }

  logger.info(`Processing job ${job.id} for URL: ${job.url}`);

  try {
    // Update job status to RUNNING
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'RUNNING', startTime: new Date() },
    });

    const scrapedData = await scrapeUrl(job.url, job.targetElements);

    // Save the scraped data
    await saveScrapedData(job.id, scrapedData);

    // Update job status to COMPLETED
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'COMPLETED', endTime: new Date() },
    });

    logger.info(`Job ${job.id} completed successfully.`);
  } catch (error) {
    logger.error(`Job ${job.id} failed: ${error.message}`, { stack: error.stack });

    // Update job status to FAILED
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: { status: 'FAILED', errorMessage: error.message.substring(0, 255), endTime: new Date() },
    });
  } finally {
    isProcessing = false;
    // Process the next job after a short delay to prevent resource exhaustion
    setTimeout(processNextJob, 1000);
  }
};

/**
 * Starts the job processing loop.
 * This should be called once when the server starts.
 */
const startJobProcessor = () => {
  logger.info('Starting job processor...');
  // Immediately try to process any pending jobs that might exist from a previous crash/restart
  prisma.scrapeJob.findMany({
    where: { status: { in: ['PENDING', 'RUNNING'] } }, // Consider RUNNING as PENDING on restart
  })
  .then(jobs => {
    jobs.forEach(job => {
      logger.warn(`Re-queuing pending/running job ${job.id} found on startup.`);
      addJobToQueue(job);
    });
    // Start the actual processing loop
    setInterval(processNextJob, 5000); // Check for new jobs every 5 seconds
    processNextJob(); // Initial kick-off
  })
  .catch(error => {
    logger.error('Failed to retrieve pending jobs on startup:', error);
  });
};


module.exports = {
  addJobToQueue,
  startJobProcessor,
  getJobQueueSize: () => jobQueue.length,
};
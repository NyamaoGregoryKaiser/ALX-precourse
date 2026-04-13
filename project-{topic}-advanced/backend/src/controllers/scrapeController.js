const { prisma } = require('../config/db');
const { logger } = require('../config/logger');
const { addJobToQueue } = require('../services/jobQueueService');
const { isValidURL, isValidCssSelector } = require('../utils/validation');
const { cache } = require('../config/cache'); // For clearing cache

/**
 * @desc Create a new scraping job
 * @route POST /api/scrape
 * @access Private
 */
exports.createScrapingJob = async (req, res, next) => {
  const { url, targetElements } = req.body;
  const userId = req.user.id;

  if (!url || !targetElements || !Array.isArray(targetElements) || targetElements.length === 0) {
    return res.status(400).json({ message: 'Please provide a URL and at least one target element.' });
  }

  if (!isValidURL(url)) {
    return res.status(400).json({ message: 'Please provide a valid URL.' });
  }

  // Validate targetElements structure
  for (const element of targetElements) {
    if (!element.name || !element.selector || !isValidCssSelector(element.selector)) {
      return res.status(400).json({ message: 'Each target element must have a valid "name" and "selector".' });
    }
    if (element.type && !['text', 'attribute', 'html'].includes(element.type)) {
      return res.status(400).json({ message: `Invalid type '${element.type}' for element '${element.name}'. Must be 'text', 'attribute', or 'html'.` });
    }
    if (element.type === 'attribute' && !element.attribute) {
      return res.status(400).json({ message: `Element '${element.name}' with type 'attribute' must specify an 'attribute' name.` });
    }
  }

  try {
    const newJob = await prisma.scrapeJob.create({
      data: {
        userId,
        url,
        targetElements: targetElements, // Stored as JSONB
        status: 'PENDING',
      },
    });

    addJobToQueue(newJob);
    logger.info(`Scraping job ${newJob.id} created for URL: ${url}`);

    // Clear relevant cache entries if necessary, e.g., job lists or results
    cache.del('/api/jobs');
    cache.del('/api/results');

    res.status(202).json({
      message: 'Scraping job initiated successfully. Check job status for results.',
      jobId: newJob.id,
      status: newJob.status,
    });
  } catch (error) {
    logger.error('Error creating scraping job:', error);
    next(error);
  }
};

/**
 * @desc Get all scraping jobs for the authenticated user
 * @route GET /api/jobs
 * @access Private
 */
exports.getScrapingJobs = async (req, res, next) => {
  const userId = req.user.id;
  const { status, limit = 10, offset = 0 } = req.query;

  try {
    const whereClause = { userId };
    if (status) {
      whereClause.status = status.toUpperCase();
    }

    const jobs = await prisma.scrapeJob.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        user: {
          select: { username: true, email: true }
        }
      }
    });

    const totalJobs = await prisma.scrapeJob.count({ where: whereClause });

    res.status(200).json({
      jobs,
      total: totalJobs,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    logger.error('Error fetching scraping jobs:', error);
    next(error);
  }
};

/**
 * @desc Get a single scraping job by ID
 * @route GET /api/jobs/:id
 * @access Private
 */
exports.getScrapingJobById = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const job = await prisma.scrapeJob.findUnique({
      where: { id: id },
      include: {
        user: { select: { username: true } },
        scrapeResults: {
          orderBy: { extractedAt: 'desc' },
          take: 1, // Only fetch the latest result if multiple
        }
      }
    });

    if (!job) {
      return res.status(404).json({ message: 'Scraping job not found.' });
    }

    // Ensure user can only view their own jobs, or if they are an ADMIN
    if (job.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to view this job.' });
    }

    res.status(200).json(job);
  } catch (error) {
    logger.error(`Error fetching scraping job ${id}:`, error);
    next(error);
  }
};

/**
 * @desc Get all scraped results (filtered by user or all for admin)
 * @route GET /api/results
 * @access Private
 */
exports.getScrapedResults = async (req, res, next) => {
  const userId = req.user.id;
  const userRole = req.user.role;
  const { jobId, limit = 10, offset = 0 } = req.query;

  try {
    const whereClause = {};

    if (userRole === 'USER') {
      whereClause.job = { userId };
    } else if (userRole === 'ADMIN' && jobId) {
      // Admin can filter by any job ID
      whereClause.jobId = jobId;
    } else if (userRole === 'ADMIN' && req.query.userId) {
      // Admin can filter by specific user
      whereClause.job = { userId: req.query.userId };
    }

    const results = await prisma.scrapeResult.findMany({
      where: whereClause,
      orderBy: { extractedAt: 'desc' },
      take: parseInt(limit, 10),
      skip: parseInt(offset, 10),
      include: {
        job: {
          select: { id: true, url: true, userId: true, user: { select: { username: true } } }
        }
      }
    });

    const totalResults = await prisma.scrapeResult.count({ where: whereClause });

    res.status(200).json({
      results,
      total: totalResults,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
    });
  } catch (error) {
    logger.error('Error fetching scraped results:', error);
    next(error);
  }
};

/**
 * @desc Get a single scraped result by ID
 * @route GET /api/results/:id
 * @access Private
 */
exports.getScrapedResultById = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const result = await prisma.scrapeResult.findUnique({
      where: { id: id },
      include: {
        job: {
          select: { id: true, url: true, userId: true }
        }
      }
    });

    if (!result) {
      return res.status(404).json({ message: 'Scraped result not found.' });
    }

    // Ensure user can only view their own results, or if they are an ADMIN
    if (result.job.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to view this result.' });
    }

    res.status(200).json(result);
  } catch (error) {
    logger.error(`Error fetching scraped result ${id}:`, error);
    next(error);
  }
};

/**
 * @desc Delete a scraped result (Admin or owner only)
 * @route DELETE /api/results/:id
 * @access Private (Admin or Owner)
 */
exports.deleteScrapedResult = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const result = await prisma.scrapeResult.findUnique({
      where: { id: id },
      include: {
        job: {
          select: { userId: true }
        }
      }
    });

    if (!result) {
      return res.status(404).json({ message: 'Scraped result not found.' });
    }

    // Only admin or the owner of the job can delete results
    if (result.job.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to delete this result.' });
    }

    await prisma.scrapeResult.delete({
      where: { id: id },
    });

    logger.info(`Scraped result ${id} deleted by user ${userId} (${userRole}).`);
    // Clear cache for results after deletion
    cache.del('/api/results');

    res.status(200).json({ message: 'Scraped result deleted successfully.' });
  } catch (error) {
    logger.error(`Error deleting scraped result ${id}:`, error);
    next(error);
  }
};

/**
 * @desc Cancel a scraping job (Admin or owner only, if status is PENDING/RUNNING)
 * @route PUT /api/jobs/:id/cancel
 * @access Private (Admin or Owner)
 */
exports.cancelScrapingJob = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    const job = await prisma.scrapeJob.findUnique({
      where: { id: id },
      select: { id: true, userId: true, status: true }
    });

    if (!job) {
      return res.status(404).json({ message: 'Scraping job not found.' });
    }

    if (job.userId !== userId && userRole !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to cancel this job.' });
    }

    if (job.status !== 'PENDING' && job.status !== 'RUNNING') {
      return res.status(400).json({ message: `Job cannot be cancelled as its status is '${job.status}'.` });
    }

    const updatedJob = await prisma.scrapeJob.update({
      where: { id: id },
      data: { status: 'CANCELLED', endTime: new Date(), errorMessage: 'Job cancelled by user.' },
    });

    logger.info(`Scraping job ${id} cancelled by user ${userId} (${userRole}).`);
    // Clear cache for job lists
    cache.del('/api/jobs');
    // In a real queue system (e.g., BullMQ), you'd also remove the job from the queue here.
    // For our in-memory queue, we just let the processor skip it.

    res.status(200).json({ message: 'Scraping job cancelled successfully.', job: updatedJob });
  } catch (error) {
    logger.error(`Error cancelling scraping job ${id}:`, error);
    next(error);
  }
};
const { Worker, Job } = require('bullmq');
const { connection } = require('./queue');
const config = require('../config');
const logger = require('../utils/logger');
const ScraperModel = require('../database/models/Scraper');
const ScrapeJobModel = require('../database/models/ScrapeJob');
const ScrapedItemModel = require('../database/models/ScrapedItem');
const { scrapeWithCheerio, scrapeWithPuppeteer } = require('../services/scrapingEngine');

const processScrapeJob = async (job) => {
  const { scraperId } = job.data;
  logger.info(`Processing scrape job for scraper ID: ${scraperId} (Job ID: ${job.id})`);

  let scraper;
  let scrapeJobRecord;
  try {
    scraper = await ScraperModel.findById(scraperId);
    if (!scraper) {
      throw new Error(`Scraper with ID ${scraperId} not found.`);
    }

    // Create a new ScrapeJob record in DB
    scrapeJobRecord = await ScrapeJobModel.create({
      scraper_id: scraper.id,
      status: 'running',
    });

    let scrapedData = [];
    if (scraper.scraping_method === 'cheerio') {
      scrapedData = await scrapeWithCheerio(scraper.start_url, scraper.selectors_json);
    } else if (scraper.scraping_method === 'puppeteer') {
      scrapedData = await scrapeWithPuppeteer(scraper.start_url, scraper.selectors_json);
    } else {
      throw new Error(`Unknown scraping method: ${scraper.scraping_method}`);
    }

    // Store scraped items
    const itemsToInsert = scrapedData.map(item => ({
      job_id: scrapeJobRecord.id,
      scraper_id: scraper.id,
      data: item,
      url: scraper.start_url, // Or actual URL if navigation occurred
    }));
    await ScrapedItemModel.bulkCreate(itemsToInsert);

    // Update ScrapeJob record
    await ScrapeJobModel.update(scrapeJobRecord.id, {
      status: 'completed',
      end_time: new Date(),
      items_scraped: itemsToInsert.length,
    });

    // Update scraper's last_run time
    await ScraperModel.updateLastRun(scraper.id);

    logger.info(`Scrape job for scraper ID: ${scraperId} (Job ID: ${job.id}) completed successfully. Scraped ${itemsToInsert.length} items.`);
    return { status: 'completed', itemsScraped: itemsToInsert.length };

  } catch (error) {
    logger.error(`Scrape job for scraper ID: ${scraperId} (Job ID: ${job.id}) failed: ${error.message}`);
    // Update ScrapeJob record to failed
    if (scrapeJobRecord) {
      await ScrapeJobModel.update(scrapeJobRecord.id, {
        status: 'failed',
        end_time: new Date(),
        error_message: error.message.substring(0, 1023), // Truncate to fit column
      });
    }
    throw error; // Re-throw to mark job as failed in BullMQ
  }
};

const scraperWorker = new Worker(config.queue.name, processScrapeJob, {
  connection,
  concurrency: config.queue.concurrency,
  // Add custom retry strategy if needed
  // defaultJobOptions: {
  //   attempts: 3,
  //   backoff: {
  //     type: 'exponential',
  //     delay: 1000,
  //   },
  // },
});

scraperWorker.on('completed', (job) => {
  logger.debug(`Job ${job.id} has completed!`);
});

scraperWorker.on('failed', (job, err) => {
  logger.error(`Job ${job.id} has failed with error: ${err.message}`);
});

scraperWorker.on('error', (err) => {
  // Log any worker errors
  logger.error(`Scraper Worker error: ${err.message}`);
});

logger.info(`BullMQ Worker '${config.queue.name}' initialized with concurrency ${config.queue.concurrency}.`);

// Function to add a cron job for existing active scrapers
const setupScheduledScrapers = async () => {
  const activeScrapers = await ScraperModel.getActiveScrapers();
  for (const scraper of activeScrapers) {
    if (scraper.schedule_cron) {
      await scrapeQueue.add(`scheduled-scrape-${scraper.id}`, { scraperId: scraper.id }, {
        repeat: { cron: scraper.schedule_cron },
        jobId: `scheduled-scrape-${scraper.id}`, // Ensures unique ID for repeatable jobs
      });
      logger.info(`Scheduled scraper '${scraper.name}' (ID: ${scraper.id}) with cron: ${scraper.schedule_cron}`);
    }
  }
};

module.exports = {
  scraperWorker,
  setupScheduledScrapers,
};
```javascript
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const logger = require('../config/logger');
const ScrapingJob = require('../models/scrapingJob.model');
const ScrapedData = require('../models/scrapedData.model');
const config = require('../config');

class ScraperService {
    constructor() {
        this.browser = null;
        this.queue = [];
        this.runningScrapes = 0;
        this.maxConcurrency = config.scraperConcurrency;
    }

    async initBrowser() {
        if (!this.browser) {
            try {
                this.browser = await puppeteer.launch({
                    headless: true, // Set to 'new' for new headless mode or false for visible browser
                    args: ['--no-sandbox', '--disable-setuid-sandbox'],
                    executablePath: process.env.CHROME_BIN || null, // For Heroku or Docker
                });
                logger.info('Puppeteer browser launched.');
            } catch (error) {
                logger.error('Failed to launch Puppeteer browser:', error.message);
                this.browser = null;
            }
        }
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            logger.info('Puppeteer browser closed.');
        }
    }

    async enqueueScrape(job) {
        this.queue.push(job);
        this.processQueue();
    }

    async processQueue() {
        if (this.runningScrapes >= this.maxConcurrency || this.queue.length === 0) {
            return;
        }

        const job = this.queue.shift();
        if (!job) return;

        this.runningScrapes++;
        logger.info(`Starting scrape job: ${job.name} (ID: ${job.id})`);
        ScrapingJob.updateJobStatus(job.id, 'running').catch(err => logger.error(`Failed to update job status to running for ${job.id}: ${err.message}`));

        try {
            const data = await this.scrape(job);
            for (const item of data) {
                await ScrapedData.create(job.id, item.url, item.data);
            }
            await ScrapingJob.updateJobStatus(job.id, 'completed', new Date());
            await ScrapingJob.logJob(job.id, 'info', `Scraping job completed. Found ${data.length} items.`);
            logger.info(`Scraping job ${job.id} completed successfully. Found ${data.length} items.`);
        } catch (error) {
            logger.error(`Scraping job ${job.id} failed: ${error.message}`);
            await ScrapingJob.updateJobStatus(job.id, 'failed', new Date());
            await ScrapingJob.logJob(job.id, 'error', `Scraping failed: ${error.message}`);
        } finally {
            this.runningScrapes--;
            this.processQueue(); // Process next job in queue
        }
    }

    async scrape(job) {
        logger.debug(`Executing scrape job ID: ${job.id}, Type: ${job.scrape_type}`);
        let scrapedItems = [];

        try {
            if (job.scrape_type === 'static') {
                scrapedItems = await this._scrapeStatic(job.start_url, JSON.parse(job.selectors));
            } else if (job.scrape_type === 'dynamic') {
                await this.initBrowser(); // Ensure browser is initialized for dynamic scrapes
                scrapedItems = await this._scrapeDynamic(job.start_url, JSON.parse(job.selectors));
            } else {
                throw new Error(`Unsupported scrape type: ${job.scrape_type}`);
            }
        } catch (error) {
            logger.error(`Error during scrape for job ${job.id}: ${error.message}`);
            throw error; // Re-throw to be caught by processQueue
        }

        return scrapedItems;
    }

    async _scrapeStatic(url, selectors) {
        logger.debug(`Scraping static URL: ${url}`);
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for URL: ${url}`);
            }
            const html = await response.text();
            const $ = cheerio.load(html);
            const results = [];

            // Assuming selectors define a "root" or an "item" selector for multiple items
            // If no item selector is provided, we treat the whole page as a single item
            const itemSelector = selectors.itemSelector || 'body'; // Default to body if no specific item selector
            const targetSelectors = { ...selectors };
            delete targetSelectors.itemSelector;

            $(itemSelector).each((i, el) => {
                const item = {};
                for (const key in targetSelectors) {
                    const selector = targetSelectors[key];
                    const element = $(el).find(selector);
                    if (element.length > 0) {
                        // Check if selector is for an attribute (e.g., [href], [src])
                        const attributeMatch = selector.match(/\[(\w+)\]$/);
                        if (attributeMatch) {
                            item[key] = element.attr(attributeMatch[1])?.trim();
                        } else {
                            item[key] = element.text()?.trim();
                        }
                    }
                }
                // Ensure a URL is part of the scraped item for record-keeping
                item.url = item.url || url;
                if (Object.keys(item).length > 1) { // At least one actual data point plus the URL
                    results.push({ url: item.url, data: item });
                }
            });

            return results;
        } catch (error) {
            logger.error(`Static scraping failed for ${url}: ${error.message}`);
            throw error;
        }
    }

    async _scrapeDynamic(url, selectors) {
        logger.debug(`Scraping dynamic URL: ${url}`);
        let page;
        try {
            if (!this.browser) {
                await this.initBrowser();
            }
            page = await this.browser.newPage();
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 }); // Wait for network to be idle
            const html = await page.content();
            const $ = cheerio.load(html);
            const results = [];

            const itemSelector = selectors.itemSelector || 'body';
            const targetSelectors = { ...selectors };
            delete targetSelectors.itemSelector;

            $(itemSelector).each((i, el) => {
                const item = {};
                for (const key in targetSelectors) {
                    const selector = targetSelectors[key];
                    const element = $(el).find(selector);
                    if (element.length > 0) {
                        const attributeMatch = selector.match(/\[(\w+)\]$/);
                        if (attributeMatch) {
                            item[key] = element.attr(attributeMatch[1])?.trim();
                        } else {
                            item[key] = element.text()?.trim();
                        }
                    }
                }
                item.url = item.url || url;
                if (Object.keys(item).length > 1) {
                    results.push({ url: item.url, data: item });
                }
            });

            return results;
        } catch (error) {
            logger.error(`Dynamic scraping failed for ${url}: ${error.message}`);
            throw error;
        } finally {
            if (page) {
                await page.close();
            }
        }
    }
}

// Export a singleton instance
module.exports = new ScraperService();
```
const { chromium, firefox, webkit } = require('playwright');
const { logger } = require('../config/logger');
const { prisma } = require('../config/db');

// Map browser string to Playwright launcher
const browserLaunchers = {
  chromium,
  firefox,
  webkit,
};

const BROWSER_TYPE = process.env.SCRAPER_BROWSER || 'chromium';

/**
 * Scrapes a given URL and extracts data based on provided CSS selectors.
 * @param {string} url - The URL to scrape.
 * @param {Array<Object>} targetElements - An array of objects, each containing { name: string, selector: string, type: 'text' | 'attribute' | 'html', attribute?: string }.
 * @returns {Promise<Object[]>} An array of objects, where each object represents extracted data.
 */
async function scrapeUrl(url, targetElements) {
  let browser;
  try {
    const launcher = browserLaunchers[BROWSER_TYPE];
    if (!launcher) {
      throw new Error(`Unsupported browser type: ${BROWSER_TYPE}`);
    }

    browser = await launcher.launch({
      headless: true, // Use headless mode in production
      args: ['--no-sandbox', '--disable-setuid-sandbox'], // Recommended for Docker environments
    });
    const page = await browser.newPage();
    logger.info(`Navigating to URL: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); // Wait for DOM to load, 60s timeout

    const results = [];

    // Evaluate the page to extract data
    const extractedData = await page.evaluate((elementsToExtract) => {
      const data = {};
      elementsToExtract.forEach(item => {
        const nodes = document.querySelectorAll(item.selector);
        if (nodes.length === 0) {
          data[item.name] = null; // Or an empty array, depending on desired output
          return;
        }

        if (nodes.length === 1) {
          const node = nodes[0];
          if (item.type === 'text') {
            data[item.name] = node.innerText.trim();
          } else if (item.type === 'attribute' && item.attribute) {
            data[item.name] = node.getAttribute(item.attribute);
          } else if (item.type === 'html') {
            data[item.name] = node.innerHTML.trim();
          } else {
            data[item.name] = node.innerText.trim(); // Default to text
          }
        } else { // Multiple elements found, return an array
          data[item.name] = Array.from(nodes).map(node => {
            if (item.type === 'text') {
              return node.innerText.trim();
            } else if (item.type === 'attribute' && item.attribute) {
              return node.getAttribute(item.attribute);
            } else if (item.type === 'html') {
              return node.innerHTML.trim();
            } else {
              return node.innerText.trim(); // Default to text
            }
          });
        }
      });
      return data;
    }, targetElements); // Pass targetElements to the page.evaluate context

    // For this example, we're returning a single object with all extracted data.
    // If you need to scrape multiple "items" on a page (e.g., a list of products),
    // the evaluation logic would need to be more complex, iterating over a parent selector.
    results.push(extractedData);

    logger.info(`Successfully scraped URL: ${url}`);
    return results;

  } catch (error) {
    logger.error(`Error scraping URL ${url}: ${error.message}`, { stack: error.stack });
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      logger.debug('Browser closed.');
    }
  }
}

/**
 * Saves scraping job and results to the database.
 * @param {string} jobId - The ID of the scraping job.
 * @param {Object[]} data - The scraped data.
 */
async function saveScrapedData(jobId, data) {
  try {
    await prisma.scrapeResult.create({
      data: {
        jobId: jobId,
        data: data, // Store the array of objects as JSONB
        extractedAt: new Date(),
      },
    });
    logger.info(`Scraped data for job ${jobId} saved successfully.`);
  } catch (error) {
    logger.error(`Error saving scraped data for job ${jobId}: ${error.message}`, { stack: error.stack });
    throw new Error('Failed to save scraped data.');
  }
}

module.exports = {
  scrapeUrl,
  saveScrapedData,
};
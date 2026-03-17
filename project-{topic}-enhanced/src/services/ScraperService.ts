```typescript
import puppeteer, { Browser, Page } from 'puppeteer';
import cheerio from 'cheerio';
import { SelectorConfig } from '../entities/ScrapingTask';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

/**
 * @file Scraper service.
 *
 * This service encapsulates the core web scraping logic, supporting both
 * headless browser (Puppeteer) for dynamic content and static HTML parsing (Cheerio).
 * It extracts data based on provided CSS/XPath selectors.
 */

export class ScraperService {
  private browser: Browser | null = null;

  constructor() {
    this.initializeBrowser().catch(err => logger.error("Failed to initialize Puppeteer browser on startup:", err));
  }

  /**
   * Initializes the Puppeteer browser instance.
   * This is called once on service instantiation to reuse the browser across tasks.
   */
  private async initializeBrowser(): Promise<void> {
    if (!this.browser) {
      try {
        this.browser = await puppeteer.launch({
          headless: "new", // Use 'new' for new headless mode, 'true' for old, 'false' for visible browser
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage', // Recommended for Docker environments
            '--incognito', // Start browser in incognito mode
          ],
        });
        logger.info('Puppeteer browser initialized successfully.');
      } catch (error) {
        logger.error('Failed to launch Puppeteer browser:', error);
        this.browser = null; // Ensure browser is null if launch fails
        throw new AppError('Failed to launch browser for scraping', 500);
      }
    }
  }

  /**
   * Ensures the browser is launched and returns it.
   * If not initialized, it will try to launch it.
   * @returns {Promise<Browser>} The Puppeteer browser instance.
   * @throws {AppError} If browser fails to launch.
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      logger.warn('Puppeteer browser not connected. Re-initializing...');
      await this.initializeBrowser();
    }
    if (!this.browser) {
      throw new AppError('Puppeteer browser failed to initialize', 500);
    }
    return this.browser;
  }

  /**
   * Closes the Puppeteer browser instance.
   */
  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Puppeteer browser closed.');
    }
  }

  /**
   * Navigates to a URL and extracts data using Puppeteer (dynamic content).
   * @param {string} url - The URL to scrape.
   * @param {SelectorConfig[]} selectors - An array of selector configurations.
   * @param {boolean} headless - Whether to run Puppeteer in headless mode.
   * @returns {Promise<Record<string, string | string[] | null>>} The extracted data.
   * @throws {AppError} If scraping fails.
   */
  async scrapeWithPuppeteer(url: string, selectors: SelectorConfig[], headless: boolean = true): Promise<Record<string, string | string[] | null>> {
    let page: Page | null = null;
    const browser = await this.getBrowser();
    try {
      page = await browser.newPage();
      await page.setBypassCSP(true); // Bypass Content Security Policy if needed

      // Set user agent to mimic a regular browser
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Add request interception to block unnecessary resources (images, fonts, stylesheets)
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].indexOf(request.resourceType()) !== -1) {
          request.abort();
        } else {
          request.continue();
        }
      });

      // Navigate to the target URL
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); // Wait for DOM content, 60s timeout

      if (!response || !response.ok()) {
        throw new AppError(`Failed to load page: ${url}, Status: ${response?.status()}`, response?.status() || 500);
      }

      const extractedData: Record<string, string | string[] | null> = {};

      for (const config of selectors) {
        extractedData[config.name] = await page.evaluate((cfg: SelectorConfig) => {
          const elements = Array.from(document.querySelectorAll(cfg.selector));
          if (!elements.length) return null;

          if (cfg.attribute) {
            return elements.map(el => el.getAttribute(cfg.attribute!) || '').filter(Boolean);
          } else {
            // If multiple elements match, return an array of texts; otherwise, return single text
            return elements.length > 1 ? elements.map(el => el.textContent?.trim() || '').filter(Boolean) : elements[0].textContent?.trim() || null;
          }
        }, config);
      }

      logger.info(`Puppeteer scraped ${url} successfully.`);
      return extractedData;
    } catch (error: any) {
      logger.error(`Puppeteer scraping failed for ${url}: ${error.message}`, { error });
      throw new AppError(`Puppeteer scraping failed for ${url}: ${error.message}`, error.statusCode || 500);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Scrapes a URL by fetching its static HTML and parsing with Cheerio.
   * Suitable for websites that do not rely heavily on JavaScript for content.
   * @param {string} url - The URL to scrape.
   * @param {SelectorConfig[]} selectors - An array of selector configurations.
   * @returns {Promise<Record<string, string | string[] | null>>} The extracted data.
   * @throws {AppError} If fetching HTML fails.
   */
  async scrapeWithCheerio(url: string, selectors: SelectorConfig[]): Promise<Record<string, string | string[] | null>> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });

      if (!response.ok) {
        throw new AppError(`Failed to fetch ${url}. Status: ${response.status}`, response.status);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const extractedData: Record<string, string | string[] | null> = {};

      for (const config of selectors) {
        const elements = $(config.selector);
        if (elements.length === 0) {
          extractedData[config.name] = null;
          continue;
        }

        if (config.attribute) {
          const values: string[] = [];
          elements.each((_i, el) => {
            const attrValue = $(el).attr(config.attribute!);
            if (attrValue) values.push(attrValue.trim());
          });
          extractedData[config.name] = values.length > 0 ? values : null;
        } else {
          const texts: string[] = [];
          elements.each((_i, el) => {
            const text = $(el).text().trim();
            if (text) texts.push(text);
          });
          extractedData[config.name] = texts.length > 1 ? texts : (texts.length === 1 ? texts[0] : null);
        }
      }

      logger.info(`Cheerio scraped ${url} successfully.`);
      return extractedData;
    } catch (error: any) {
      logger.error(`Cheerio scraping failed for ${url}: ${error.message}`, { error });
      throw new AppError(`Cheerio scraping failed for ${url}: ${error.message}`, error.statusCode || 500);
    }
  }

  /**
   * Orchestrates the scraping process based on the `headless` flag.
   * @param {string} url - The URL to scrape.
   * @param {SelectorConfig[]} selectors - An array of selector configurations.
   * @param {boolean} useHeadlessBrowser - If true, uses Puppeteer; otherwise, uses Cheerio (fetch).
   * @returns {Promise<Record<string, string | string[] | null>>} The extracted data.
   */
  async scrape(url: string, selectors: SelectorConfig[], useHeadlessBrowser: boolean): Promise<Record<string, string | string[] | null>> {
    if (useHeadlessBrowser) {
      logger.debug(`Initiating headless browser scrape for: ${url}`);
      return this.scrapeWithPuppeteer(url, selectors);
    } else {
      logger.debug(`Initiating static HTML scrape (Cheerio) for: ${url}`);
      return this.scrapeWithCheerio(url, selectors);
    }
  }
}
```
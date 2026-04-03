```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { IScraperStrategy } from './scraper-strategy.interface';
import { ScrapingConfigDto } from '../dto/scraping-config.dto';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class PuppeteerScraperStrategy implements IScraperStrategy {
  private readonly logger: LoggerService = new LoggerService(); // Direct instance for strategies
  private browser: puppeteer.Browser | null = null;
  private browserStartupPromise: Promise<void> | null = null;
  private readonly executablePath: string | undefined;

  constructor(executablePath?: string) {
    this.executablePath = executablePath;
  }

  private async initializeBrowser(): Promise<void> {
    if (this.browser && this.browser.isConnected()) {
      return;
    }
    if (this.browserStartupPromise) {
      return this.browserStartupPromise;
    }

    this.browserStartupPromise = (async () => {
      this.logger.log('Launching Puppeteer browser...', 'PuppeteerScraperStrategy');
      try {
        this.browser = await puppeteer.launch({
          headless: 'new', // Use 'new' for new headless mode
          executablePath: this.executablePath, // For Docker environments
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // This might save some RAM in Docker
            '--disable-gpu',
          ],
        });
        this.logger.log('Puppeteer browser launched.', 'PuppeteerScraperStrategy');
      } catch (error) {
        this.logger.error(`Failed to launch Puppeteer: ${error.message}`, error.stack, 'PuppeteerScraperStrategy');
        this.browser = null; // Ensure browser is null if launch failed
        throw new InternalServerErrorException('Failed to launch browser for scraping.');
      } finally {
        this.browserStartupPromise = null;
      }
    })();
    return this.browserStartupPromise;
  }

  async closeBrowser(): Promise<void> {
    if (this.browser && this.browser.isConnected()) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Puppeteer browser closed.', 'PuppeteerScraperStrategy');
    }
  }

  async scrape(url: string, config: ScrapingConfigDto): Promise<any[]> {
    await this.initializeBrowser(); // Ensure browser is launched

    if (!this.browser) {
      throw new InternalServerErrorException('Puppeteer browser is not initialized.');
    }

    let page: puppeteer.Page | null = null;
    try {
      page = await this.browser.newPage();
      page.setDefaultNavigationTimeout(60000); // 60 seconds timeout
      this.logger.debug(`Navigating to ${url}...`, 'PuppeteerScraperStrategy');
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Wait for a common selector if provided in config, or a default time
      if (config.waitForSelector) {
        await page.waitForSelector(config.waitForSelector, { timeout: 15000 });
        this.logger.debug(`Waited for selector: ${config.waitForSelector}`, 'PuppeteerScraperStrategy');
      } else {
        await page.waitForTimeout(config.initialDelay || 2000); // Wait 2 seconds by default
      }

      const extractedData = await page.evaluate((cfg: ScrapingConfigDto) => {
        const results: any[] = [];
        const items = cfg.itemSelector
          ? Array.from(document.querySelectorAll(cfg.itemSelector))
          : [document]; // If no itemSelector, scrape from the whole document

        for (const item of items) {
          const data: { [key: string]: string | string[] } = {};
          if (cfg.fields) {
            for (const field of cfg.fields) {
              const elements = Array.from(item.querySelectorAll(field.selector));
              if (elements.length > 0) {
                if (field.multiple) {
                  data[field.name] = elements.map((el) =>
                    field.attribute ? el.getAttribute(field.attribute) : el.textContent?.trim(),
                  ).filter(Boolean); // Filter out null/undefined
                } else {
                  const el = elements[0];
                  data[field.name] = field.attribute ? el.getAttribute(field.attribute) : el.textContent?.trim();
                }
              } else if (field.defaultValue !== undefined) {
                  data[field.name] = field.defaultValue;
              }
            }
          }
          if (Object.keys(data).length > 0) {
            results.push(data);
          }
        }
        return results;
      }, config);

      return extractedData;
    } catch (error) {
      this.logger.error(
        `Scraping failed for ${url}: ${error.message}`,
        error.stack,
        'PuppeteerScraperStrategy',
      );
      throw new InternalServerErrorException(`Scraping failed for ${url}: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
      // Consider not closing the browser after each scrape for performance,
      // but manage a pool of pages or close after a certain idle time.
      // For simplicity, we keep the browser open.
      // await this.closeBrowser(); // Only if you want to close after each scrape
    }
  }
}
```
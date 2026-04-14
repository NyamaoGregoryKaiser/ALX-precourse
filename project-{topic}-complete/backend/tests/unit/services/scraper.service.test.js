```javascript
const scraperService = require('../../../src/services/scraper.service');
const ScrapingJob = require('../../../src/models/scrapingJob.model');
const ScrapedData = require('../../../src/models/scrapedData.model');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const logger = require('../../../src/config/logger');

// Mock external dependencies
jest.mock('../../../src/models/scrapingJob.model');
jest.mock('../../../src/models/scrapedData.model');
jest.mock('puppeteer', () => ({
    launch: jest.fn(() => ({
        newPage: jest.fn(() => ({
            goto: jest.fn(),
            content: jest.fn(() => '<html><body><div class="item"><h2 class="title">Dynamic Title</h2><a class="url" href="https://dynamic.com/page1">Link 1</a></div></body></html>'),
            close: jest.fn(),
        })),
        close: jest.fn(),
    })),
}));
jest.mock('node-fetch', () => jest.fn(() =>
    Promise.resolve({
        ok: true,
        text: () => Promise.resolve('<html><body><div class="product"><h1 class="name">Static Product</h1><span class="price">$100</span><a class="link" href="https://static.com/item1">Details</a></div></body></html>'),
    })
)); // Mocking fetch for static scraping
jest.mock('../../../src/config/logger'); // Mock logger to prevent console spam

describe('ScraperService Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset singleton queue
        scraperService.queue = [];
        scraperService.runningScrapes = 0;
        scraperService.browser = null; // Ensure browser is null before each test
    });

    afterAll(async () => {
        await scraperService.closeBrowser(); // Ensure browser is closed after all tests
    });

    describe('initBrowser and closeBrowser', () => {
        test('should initialize browser if not already initialized', async () => {
            await scraperService.initBrowser();
            expect(puppeteer.launch).toHaveBeenCalledTimes(1);
            expect(scraperService.browser).toBeDefined();

            // Calling again should not launch a new browser
            await scraperService.initBrowser();
            expect(puppeteer.launch).toHaveBeenCalledTimes(1);
        });

        test('should close browser if initialized', async () => {
            await scraperService.initBrowser(); // Ensure it's initialized
            const browserInstance = scraperService.browser;
            await scraperService.closeBrowser();
            expect(browserInstance.close).toHaveBeenCalledTimes(1);
            expect(scraperService.browser).toBeNull();
        });

        test('should handle browser launch failure gracefully', async () => {
            puppeteer.launch.mockRejectedValueOnce(new Error('Browser launch failed'));
            await scraperService.initBrowser();
            expect(scraperService.browser).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to launch Puppeteer browser'), expect.any(String));
        });
    });

    describe('_scrapeStatic', () => {
        test('should scrape static content correctly', async () => {
            const url = 'http://example.com/static';
            const selectors = {
                itemSelector: '.product',
                name: '.name',
                price: '.price',
                url: '.link[href]'
            };
            const expectedData = [{
                url: 'https://static.com/item1',
                data: {
                    name: 'Static Product',
                    price: '$100',
                    url: 'https://static.com/item1'
                }
            }];
            const results = await scraperService._scrapeStatic(url, selectors);
            expect(results).toEqual(expectedData);
        });

        test('should throw error for failed static fetch', async () => {
            require('node-fetch').mockImplementationOnce(() =>
                Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve('Not Found') })
            );
            await expect(scraperService._scrapeStatic('http://bad.com', {})).rejects.toThrow('HTTP error! status: 404 for URL: http://bad.com');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('_scrapeDynamic', () => {
        test('should scrape dynamic content correctly', async () => {
            const url = 'http://example.com/dynamic';
            const selectors = {
                itemSelector: '.item',
                title: '.title',
                url: '.url[href]'
            };
            const expectedData = [{
                url: 'https://dynamic.com/page1',
                data: {
                    title: 'Dynamic Title',
                    url: 'https://dynamic.com/page1'
                }
            }];

            const results = await scraperService._scrapeDynamic(url, selectors);
            expect(puppeteer.launch).toHaveBeenCalledTimes(1); // Browser launched
            expect(results).toEqual(expectedData);
        });

        test('should handle errors during dynamic scraping', async () => {
            // Mock browser page to throw error on goto
            puppeteer.launch.mockImplementationOnce(() => ({
                newPage: jest.fn(() => ({
                    goto: jest.fn().mockRejectedValueOnce(new Error('Page navigation failed')),
                    close: jest.fn(),
                })),
                close: jest.fn(),
            }));

            await expect(scraperService._scrapeDynamic('http://bad.com/dynamic', { title: 'h1' }))
                .rejects.toThrow('Page navigation failed');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('enqueueScrape and processQueue', () => {
        test('should enqueue a job and process it', async () => {
            const mockJob = {
                id: 1,
                name: 'Test Static Job',
                start_url: 'http://example.com',
                selectors: JSON.stringify({ itemSelector: '.product', title: '.name' }),
                scrape_type: 'static',
                is_active: true,
                schedule_cron: null,
            };

            const scrapeStaticSpy = jest.spyOn(scraperService, '_scrapeStatic').mockResolvedValue([
                { url: 'http://example.com/item1', data: { title: 'Item 1' } }
            ]);

            ScrapingJob.updateJobStatus.mockResolvedValue();
            ScrapingJob.logJob.mockResolvedValue();
            ScrapedData.create.mockResolvedValue();

            scraperService.enqueueScrape(mockJob);

            // Wait for the asynchronous processing to complete
            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to allow async queue processing

            expect(ScrapingJob.updateJobStatus).toHaveBeenCalledWith(mockJob.id, 'running');
            expect(scrapeStaticSpy).toHaveBeenCalledWith(mockJob.start_url, JSON.parse(mockJob.selectors));
            expect(ScrapedData.create).toHaveBeenCalledWith(mockJob.id, 'http://example.com/item1', { title: 'Item 1' });
            expect(ScrapingJob.updateJobStatus).toHaveBeenCalledWith(mockJob.id, 'completed', expect.any(Date));
            expect(ScrapingJob.logJob).toHaveBeenCalledWith(mockJob.id, 'info', expect.stringContaining('Scraping job completed'));
        });

        test('should update job status to failed if scraping fails', async () => {
            const mockJob = {
                id: 2,
                name: 'Failing Job',
                start_url: 'http://failing.com',
                selectors: JSON.stringify({ title: 'h1' }),
                scrape_type: 'static',
                is_active: true,
                schedule_cron: null,
            };

            const scrapeStaticSpy = jest.spyOn(scraperService, '_scrapeStatic').mockRejectedValue(new Error('Scraping error'));
            ScrapingJob.updateJobStatus.mockResolvedValue();
            ScrapingJob.logJob.mockResolvedValue();

            scraperService.enqueueScrape(mockJob);

            await new Promise(resolve => setTimeout(resolve, 100)); // Small delay

            expect(ScrapingJob.updateJobStatus).toHaveBeenCalledWith(mockJob.id, 'running');
            expect(scrapeStaticSpy).toHaveBeenCalled();
            expect(ScrapingJob.updateJobStatus).toHaveBeenCalledWith(mockJob.id, 'failed', expect.any(Date));
            expect(ScrapingJob.logJob).toHaveBeenCalledWith(mockJob.id, 'error', expect.stringContaining('Scraping failed'));
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(`Scraping job ${mockJob.id} failed`), expect.any(String));
        });

        test('should respect max concurrency', async () => {
            const mockJob = (id) => ({
                id,
                name: `Job ${id}`,
                start_url: `http://test.com/${id}`,
                selectors: JSON.stringify({ title: 'h1' }),
                scrape_type: 'static',
                is_active: true,
                schedule_cron: null,
            });

            // Make scrape take longer than usual to test concurrency
            jest.spyOn(scraperService, '_scrapeStatic').mockImplementation(() =>
                new Promise(resolve => setTimeout(() => resolve([{ url: 'test', data: {} }]), 50))
            );
            ScrapingJob.updateJobStatus.mockResolvedValue();
            ScrapingJob.logJob.mockResolvedValue();
            ScrapedData.create.mockResolvedValue();

            scraperService.maxConcurrency = 2; // Set low concurrency for test

            // Enqueue more jobs than maxConcurrency
            scraperService.enqueueScrape(mockJob(1));
            scraperService.enqueueScrape(mockJob(2));
            scraperService.enqueueScrape(mockJob(3)); // This one should be queued

            // Initially, only 2 should run
            expect(scraperService.runningScrapes).toBe(2);
            expect(scraperService.queue.length).toBe(1);

            await new Promise(resolve => setTimeout(resolve, 75)); // Wait for first batch to finish

            // After first batch, the 3rd job should start
            expect(scraperService.runningScrapes).toBe(1);
            expect(scraperService.queue.length).toBe(0);

            await new Promise(resolve => setTimeout(resolve, 75)); // Wait for last job to finish

            expect(scraperService.runningScrapes).toBe(0);
            expect(ScrapingJob.updateJobStatus).toHaveBeenCalledTimes(6); // 3 'running' + 3 'completed'
            expect(scraperService._scrapeStatic).toHaveBeenCalledTimes(3);
        });
    });
});
```
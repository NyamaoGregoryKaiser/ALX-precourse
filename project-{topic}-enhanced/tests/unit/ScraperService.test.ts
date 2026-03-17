```typescript
import { ScraperService } from '../../src/services/ScraperService';
import { AppError } from '../../src/utils/AppError';
import { SelectorConfig } from '../../src/entities/ScrapingTask';
import puppeteer, { Browser, Page, Response } from 'puppeteer';
import cheerio from 'cheerio';

// Mock Puppeteer
jest.mock('puppeteer', () => ({
  launch: jest.fn(() => ({
    newPage: jest.fn(() => ({
      setBypassCSP: jest.fn(),
      setUserAgent: jest.fn(),
      setRequestInterception: jest.fn(),
      on: jest.fn((event, handler) => {
        // Mock request interception to allow all requests by default for tests
        if (event === 'request') {
          // Simulate request.continue() if no explicit mock
          handler({ resourceType: () => 'document', continue: jest.fn() });
        }
      }),
      goto: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
    })),
    close: jest.fn(),
    isConnected: jest.fn(() => true),
  })),
}));

// Mock cheerio to load HTML
jest.mock('cheerio', () => ({
  load: jest.fn((html: string) => {
    // Basic mock that returns a jQuery-like object
    const mockElements = {
      text: () => html, // Simple text extraction for basic tests
      attr: (key: string) => `mock-attr-${key}`,
      each: (callback: (_i: number, el: any) => void) => {
        // For multiple elements, we'd need a more sophisticated mock
        callback(0, {}); // Simulate one element for now
      }
    };
    const $ = (selector: string) => {
      // Simulate finding elements
      if (html.includes(selector)) {
        mockElements.text = () => $(selector).text(); // More specific text content
        return {
          length: 1,
          text: () => `text from ${selector}`, // Simplified for testing
          attr: (key: string) => `attr ${key} from ${selector}`,
          each: (callback: (_i: number, el: any) => void) => callback(0, { }),
          ...mockElements
        };
      }
      return { length: 0 };
    };
    // Mock the main cheerio loading
    return $;
  }),
}));


// Mock global.fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;


describe('ScraperService (Unit Tests)', () => {
  let scraperService: ScraperService;
  let mockBrowser: Browser;
  let mockPage: Page;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (puppeteer.launch as jest.Mock).mockClear();

    // Mock Puppeteer setup
    mockPage = {
      setBypassCSP: jest.fn(),
      setUserAgent: jest.fn(),
      setRequestInterception: jest.fn(),
      on: jest.fn((event, handler) => {
        if (event === 'request') {
          // Default: allow all requests
          handler({ resourceType: () => 'document', continue: jest.fn() });
        }
      }),
      goto: jest.fn(),
      evaluate: jest.fn(),
      close: jest.fn(),
    } as unknown as Page;

    mockBrowser = {
      newPage: jest.fn(() => Promise.resolve(mockPage)),
      close: jest.fn(() => Promise.resolve()),
      isConnected: jest.fn(() => true),
    } as unknown as Browser;

    (puppeteer.launch as jest.Mock).mockResolvedValue(mockBrowser);

    // Create a new instance of ScraperService for each test
    // We call a private method directly for initialization control in tests
    scraperService = new ScraperService();
    // Ensure browser is initialized for each test if not already.
    // In a real app, this would happen once on service boot.
    // For tests, we might need to await it or mock it to be already initialized.
    // For now, ScraperService's constructor `initializeBrowser` should handle it.
  });

  afterEach(async () => {
    await scraperService.closeBrowser(); // Ensure browser is closed after each test
  });

  describe('scrapeWithPuppeteer', () => {
    const url = 'http://example.com';
    const selectors: SelectorConfig[] = [
      { name: 'title', selector: 'h1' },
      { name: 'link', selector: 'a', attribute: 'href' },
    ];

    it('should successfully scrape data using Puppeteer', async () => {
      (mockPage.goto as jest.Mock).mockResolvedValue({ ok: () => true } as Response);
      (mockPage.evaluate as jest.Mock)
        .mockResolvedValueOnce('Page Title') // For 'h1'
        .mockResolvedValueOnce(['http://example.com/link1', 'http://example.com/link2']); // For 'a[href]'

      const result = await scraperService.scrapeWithPuppeteer(url, selectors, true);

      expect(puppeteer.launch).toHaveBeenCalledTimes(1); // Browser launched once
      expect(mockBrowser.newPage).toHaveBeenCalledTimes(1);
      expect(mockPage.goto).toHaveBeenCalledWith(url, expect.any(Object));
      expect(mockPage.evaluate).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        title: 'Page Title',
        link: ['http://example.com/link1', 'http://example.com/link2'],
      });
      expect(mockPage.close).toHaveBeenCalledTimes(1);
    });

    it('should return null for missing selectors in Puppeteer', async () => {
      (mockPage.goto as jest.Mock).mockResolvedValue({ ok: () => true } as Response);
      (mockPage.evaluate as jest.Mock)
        .mockResolvedValueOnce(null) // For 'h1' (not found)
        .mockResolvedValueOnce(null); // For 'a[href]' (not found)

      const result = await scraperService.scrapeWithPuppeteer(url, selectors, true);

      expect(result).toEqual({ title: null, link: null });
    });

    it('should throw AppError if page loading fails in Puppeteer', async () => {
      (mockPage.goto as jest.Mock).mockResolvedValue({ ok: () => false, status: () => 404 } as Response);

      await expect(scraperService.scrapeWithPuppeteer(url, selectors, true)).rejects.toThrow(AppError);
      await expect(scraperService.scrapeWithPuppeteer(url, selectors, true)).rejects.toHaveProperty('statusCode', 404);
    });

    it('should handle Puppeteer evaluation errors gracefully', async () => {
      (mockPage.goto as jest.Mock).mockResolvedValue({ ok: () => true } as Response);
      (mockPage.evaluate as jest.Mock).mockRejectedValue(new Error('Evaluation failed'));

      await expect(scraperService.scrapeWithPuppeteer(url, selectors, true)).rejects.toThrow(AppError);
      await expect(scraperService.scrapeWithPuppeteer(url, selectors, true)).rejects.toHaveProperty('message', expect.stringContaining('Evaluation failed'));
    });
  });

  describe('scrapeWithCheerio', () => {
    const url = 'http://static.example.com';
    const selectors: SelectorConfig[] = [
      { name: 'itemText', selector: '.item' },
      { name: 'itemLink', selector: '.item a', attribute: 'href' },
    ];
    const mockHtml = `
      <html>
        <body>
          <div class="item">Text 1</div>
          <div class="item"><a href="/link1">Link 1</a></div>
          <div class="item">Text 3</div>
        </body>
      </html>
    `;

    beforeEach(() => {
      (cheerio.load as jest.Mock).mockClear();
    });

    it('should successfully scrape data using Cheerio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockHtml),
      });

      // Mock cheerio's internal logic for more realistic behavior
      (cheerio.load as jest.Mock).mockImplementationOnce((htmlContent: string) => {
        const $ = jest.requireActual('cheerio').load(htmlContent);
        return $;
      });

      const result = await scraperService.scrapeWithCheerio(url, selectors);

      expect(mockFetch).toHaveBeenCalledWith(url, expect.any(Object));
      expect(cheerio.load).toHaveBeenCalledWith(mockHtml);
      expect(result).toEqual({
        itemText: ['Text 1', 'Link 1', 'Text 3'], // cheerio.text() gets all descendant text
        itemLink: ['/link1'],
      });
    });

    it('should return null for missing selectors in Cheerio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html><body></body></html>'),
      });

      // Mock cheerio's internal logic for more realistic behavior
      (cheerio.load as jest.Mock).mockImplementationOnce((htmlContent: string) => {
        const $ = jest.requireActual('cheerio').load(htmlContent);
        return $;
      });

      const result = await scraperService.scrapeWithCheerio(url, selectors);

      expect(result).toEqual({ itemText: null, itemLink: null });
    });

    it('should throw AppError if fetching HTML fails in Cheerio', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(scraperService.scrapeWithCheerio(url, selectors)).rejects.toThrow(AppError);
      await expect(scraperService.scrapeWithCheerio(url, selectors)).rejects.toHaveProperty('statusCode', 500);
    });
  });

  describe('scrape', () => {
    const url = 'http://test.com';
    const selectors: SelectorConfig[] = [{ name: 'data', selector: 'div' }];

    it('should call scrapeWithPuppeteer when useHeadlessBrowser is true', async () => {
      const puppeteerSpy = jest.spyOn(scraperService, 'scrapeWithPuppeteer').mockResolvedValue({ data: 'puppeteer result' });
      const cheerioSpy = jest.spyOn(scraperService, 'scrapeWithCheerio').mockResolvedValue({ data: 'cheerio result' });

      const result = await scraperService.scrape(url, selectors, true);

      expect(puppeteerSpy).toHaveBeenCalledWith(url, selectors);
      expect(cheerioSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ data: 'puppeteer result' });
    });

    it('should call scrapeWithCheerio when useHeadlessBrowser is false', async () => {
      const puppeteerSpy = jest.spyOn(scraperService, 'scrapeWithPuppeteer').mockResolvedValue({ data: 'puppeteer result' });
      const cheerioSpy = jest.spyOn(scraperService, 'scrapeWithCheerio').mockResolvedValue({ data: 'cheerio result' });

      const result = await scraperService.scrape(url, selectors, false);

      expect(cheerioSpy).toHaveBeenCalledWith(url, selectors);
      expect(puppeteerSpy).not.toHaveBeenCalled();
      expect(result).toEqual({ data: 'cheerio result' });
    });
  });
});
```
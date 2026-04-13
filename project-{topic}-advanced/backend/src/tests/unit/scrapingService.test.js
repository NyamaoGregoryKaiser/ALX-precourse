const { scrapeUrl } = require('../../services/scrapingService');
const { chromium } = require('playwright'); // Mock this
const { prisma } = require('../../config/db'); // Mock this as well

// Mock Playwright browser launcher
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn(() => ({
      newPage: jest.fn(() => ({
        goto: jest.fn(),
        evaluate: jest.fn(),
        close: jest.fn(),
      })),
      close: jest.fn(),
    })),
  },
}));

// Mock Prisma client operations for unit tests where DB interaction isn't the focus
jest.mock('../../config/db', () => ({
  prisma: {
    scrapeResult: {
      create: jest.fn(),
    },
    scrapeJob: {
      update: jest.fn(),
    },
    $disconnect: jest.fn(),
    $connect: jest.fn(),
  },
}));

describe('scrapingService unit tests', () => {
  let mockBrowser;
  let mockPage;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    mockPage = {
      goto: jest.fn().mockResolvedValue(undefined),
      evaluate: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    };
    mockBrowser = {
      newPage: jest.fn().mockResolvedValue(mockPage),
      close: jest.fn().mockResolvedValue(undefined),
    };
    chromium.launch.mockResolvedValue(mockBrowser);
  });

  it('should successfully scrape a URL and extract text', async () => {
    const url = 'http://example.com';
    const targetElements = [{ name: 'title', selector: 'h1', type: 'text' }];
    const expectedData = { title: 'Example Domain' };

    mockPage.evaluate.mockResolvedValue(expectedData);

    const result = await scrapeUrl(url, targetElements);

    expect(chromium.launch).toHaveBeenCalledWith({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    expect(mockBrowser.newPage).toHaveBeenCalled();
    expect(mockPage.goto).toHaveBeenCalledWith(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    expect(mockPage.evaluate).toHaveBeenCalledWith(targetElements);
    expect(mockBrowser.close).toHaveBeenCalled();
    expect(result).toEqual([expectedData]);
  });

  it('should handle multiple target elements and different types', async () => {
    const url = 'http://another-example.com';
    const targetElements = [
      { name: 'heading', selector: 'h1', type: 'text' },
      { name: 'linkHref', selector: 'a', type: 'attribute', attribute: 'href' },
    ];
    const expectedData = {
      heading: 'Test Page',
      linkHref: 'https://example.com/link',
    };

    mockPage.evaluate.mockResolvedValue(expectedData);

    const result = await scrapeUrl(url, targetElements);
    expect(result).toEqual([expectedData]);
    expect(mockPage.evaluate).toHaveBeenCalledWith(targetElements);
  });

  it('should throw an error if scraping fails', async () => {
    const url = 'http://fail.com';
    const targetElements = [{ name: 'title', selector: 'h1', type: 'text' }];
    const errorMessage = 'Network error occurred';

    mockPage.goto.mockRejectedValue(new Error(errorMessage));

    await expect(scrapeUrl(url, targetElements)).rejects.toThrow(`Failed to scrape ${url}: ${errorMessage}`);
    expect(mockBrowser.close).toHaveBeenCalled(); // Browser should still close
  });

  it('should handle empty target elements gracefully by returning empty data structure', async () => {
    const url = 'http://example.com';
    const targetElements = [];
    const expectedData = {};

    mockPage.evaluate.mockResolvedValue(expectedData); // When no elements, eval returns empty

    const result = await scrapeUrl(url, targetElements);
    expect(result).toEqual([expectedData]);
    expect(mockPage.evaluate).toHaveBeenCalledWith(targetElements);
  });
});
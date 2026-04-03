```typescript
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IScraperStrategy } from './scraper-strategy.interface';
import { PuppeteerScraperStrategy } from './puppeteer-scraper.strategy';

@Injectable()
export class ScraperStrategyFactory {
  constructor(private configService: ConfigService) {}

  createScraper(type: 'puppeteer' | 'cheerio'): IScraperStrategy {
    switch (type) {
      case 'puppeteer':
        const puppeteerExecutablePath = this.configService.get<string>('puppeteerExecutablePath');
        return new PuppeteerScraperStrategy(puppeteerExecutablePath);
      case 'cheerio':
        // return new CheerioScraperStrategy(); // Implement Cheerio if needed
        throw new BadRequestException('Cheerio scraper not yet implemented.');
      default:
        throw new BadRequestException(`Unknown scraper strategy type: ${type}`);
    }
  }
}
```
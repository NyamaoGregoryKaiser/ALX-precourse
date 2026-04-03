```typescript
import { ScrapingConfigDto } from '../dto/scraping-config.dto';

export interface IScraperStrategy {
  /**
   * Scrapes a given URL based on the provided configuration.
   * @param url The URL to scrape.
   * @param config The scraping configuration (selectors, attributes, etc.).
   * @returns A promise resolving to an array of extracted data objects.
   */
  scrape(url: string, config: ScrapingConfigDto): Promise<any[]>;
}
```
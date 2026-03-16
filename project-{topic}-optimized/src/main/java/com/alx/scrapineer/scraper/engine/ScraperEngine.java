```java
package com.alx.scrapineer.scraper.engine;

import com.alx.scrapineer.data.entity.CssSelector;
import com.alx.scrapineer.data.entity.ScrapingTarget;

import java.util.Map;

/**
 * Interface for a generic web scraping engine.
 * Different implementations can use different libraries (e.g., Jsoup, Selenium).
 */
public interface ScraperEngine {

    /**
     * Scrapes a given URL and extracts data based on provided CSS selectors.
     *
     * @param target The scraping target containing the URL and selectors.
     * @return A map where keys are selector names and values are the extracted data.
     * @throws ScraperException if there is an error during scraping or parsing.
     */
    Map<String, String> scrape(ScrapingTarget target) throws ScraperException;

    /**
     * Checks if the scraper engine supports a specific content type or dynamic JS.
     * This can be used to select the appropriate engine for a target.
     * @return true if the engine handles dynamic content (e.g. Selenium), false otherwise (e.g. Jsoup)
     */
    boolean supportsDynamicContent();
}
```
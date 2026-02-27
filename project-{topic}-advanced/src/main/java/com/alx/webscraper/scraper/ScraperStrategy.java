```java
package com.alx.webscraper.scraper;

import com.alx.webscraper.model.DataField;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Interface for different web scraping strategies.
 * Allows for easy addition of new scraping methods (e.g., Selenium for dynamic content).
 */
public interface ScraperStrategy {

    /**
     * Scrapes data from a given URL based on a list of data fields.
     *
     * @param url The URL to scrape.
     * @param dataFields A list of DataField objects defining what to extract.
     * @return A list of maps, where each map represents a set of extracted data (e.g., one product item).
     *         Each map contains field names as keys and extracted values as strings.
     * @throws IOException If there's an issue connecting to the URL or parsing content.
     */
    List<Map<String, String>> scrape(String url, List<DataField> dataFields) throws IOException;
}
```
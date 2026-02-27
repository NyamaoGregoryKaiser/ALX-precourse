```java
package com.alx.webscraper.scraper;

import com.alx.webscraper.model.DataField;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Implements the ScraperStrategy using Jsoup for static HTML content scraping.
 * This component focuses on parsing HTML and extracting data based on CSS selectors.
 */
@Component
public class HtmlScraper implements ScraperStrategy {

    private static final Logger logger = LoggerFactory.getLogger(HtmlScraper.class);

    private static final int TIMEOUT_MILLIS = 10000; // 10 seconds timeout

    @Override
    public List<Map<String, String>> scrape(String url, List<DataField> dataFields) throws IOException {
        if (dataFields == null || dataFields.isEmpty()) {
            logger.warn("No data fields provided for scraping URL: {}", url);
            return List.of();
        }

        logger.info("Starting HTML scraping for URL: {}", url);
        Document doc = Jsoup.connect(url)
                .timeout(TIMEOUT_MILLIS)
                .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36")
                .header("Accept-Language", "en-US,en;q=0.9")
                .get();
        logger.debug("Successfully fetched document from {}", url);

        // Group data fields by a common parent selector if possible,
        // otherwise, treat each field independently.
        // For simplicity, this implementation assumes a flat structure where each data field's selector
        // directly points to the element to be extracted, or a common parent is used across all fields.
        // A more advanced scraper might group fields by a "record selector" (e.g., "div.product-item")
        // and then extract sub-fields within each record.
        // For this demo, we'll try to find the most specific common parent elements.

        // Find all unique root elements specified by the dataFields selectors
        List<Elements> allFieldElements = dataFields.stream()
                .map(field -> doc.select(field.getCssSelector()))
                .filter(elements -> !elements.isEmpty())
                .collect(Collectors.toList());

        if (allFieldElements.isEmpty()) {
            logger.warn("No elements found for any data field selectors on URL: {}", url);
            return List.of();
        }

        // Determine the number of "records" based on the most common parent or the first field.
        // This is a simplified approach for demonstration.
        // A production system might require a specific "item selector" in the task definition.
        int numRecords = allFieldElements.stream()
                .mapToInt(Elements::size)
                .max()
                .orElse(1); // Default to 1 if no elements found, to still attempt extraction

        List<Map<String, String>> scrapedRecords = new ArrayList<>();

        for (int i = 0; i < numRecords; i++) {
            Map<String, String> record = new HashMap<>();
            for (DataField field : dataFields) {
                Elements elements = doc.select(field.getCssSelector());
                String value = null;

                if (!elements.isEmpty()) {
                    if (elements.size() > i) {
                        Element targetElement = elements.get(i); // Get the i-th element if multiple exist
                        if (field.getAttribute() != null && !field.getAttribute().isEmpty()) {
                            value = targetElement.attr(field.getAttribute());
                        } else {
                            value = targetElement.text();
                        }
                    } else {
                        logger.debug("Element for selector '{}' has fewer than {} items. Skipping.", field.getCssSelector(), i + 1);
                    }
                } else {
                    logger.debug("No element found for selector: {}", field.getCssSelector());
                }
                record.put(field.getFieldName(), value != null ? value.trim() : "");
            }
            if (!record.isEmpty() && record.values().stream().anyMatch(v -> !v.isEmpty())) {
                scrapedRecords.add(record);
            }
        }

        logger.info("Finished HTML scraping for URL: {}. Extracted {} records.", url, scrapedRecords.size());
        return scrapedRecords;
    }
}
```
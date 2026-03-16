```java
package com.alx.scrapineer.scraper.strategy;

import com.alx.scrapineer.data.entity.CssSelector;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.SelectorType;
import com.alx.scrapineer.scraper.engine.ScraperEngine;
import com.alx.scrapineer.scraper.engine.ScraperException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Jsoup-based implementation of the ScraperEngine for static HTML content.
 */
@Component
public class JsoupScraperEngine implements ScraperEngine {

    private static final Logger logger = LoggerFactory.getLogger(JsoupScraperEngine.class);
    private static final int TIMEOUT_MILLIS = 10000; // 10 seconds

    @Override
    public Map<String, String> scrape(ScrapingTarget target) throws ScraperException {
        Map<String, String> extractedData = new HashMap<>();
        Document doc;
        try {
            logger.info("Connecting to URL: {}", target.getUrl());
            doc = Jsoup.connect(target.getUrl())
                    .timeout(TIMEOUT_MILLIS)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36")
                    .get();
        } catch (IOException e) {
            logger.error("Failed to connect or retrieve content from {}: {}", target.getUrl(), e.getMessage());
            throw new ScraperException("Failed to connect or retrieve content: " + e.getMessage(), e);
        }

        for (CssSelector selector : target.getSelectors()) {
            Optional<String> value = extractData(doc, selector);
            extractedData.put(selector.getName(), value.orElse(null));
        }

        return extractedData;
    }

    private Optional<String> extractData(Document doc, CssSelector selector) {
        try {
            Element element = doc.selectFirst(selector.getSelectorValue());
            if (element == null) {
                logger.warn("No element found for selector: {} on target: {}", selector.getSelectorValue(), selector.getTarget().getUrl());
                return Optional.empty();
            }

            String extractedValue = null;
            if (selector.getType() == SelectorType.TEXT) {
                extractedValue = element.text();
            } else if (selector.getType() == SelectorType.ATTRIBUTE) {
                if (selector.getAttributeName() != null && !selector.getAttributeName().isEmpty()) {
                    extractedValue = element.attr(selector.getAttributeName());
                } else {
                    logger.warn("Attribute name not specified for selector type ATTRIBUTE: {}", selector.getName());
                }
            } else if (selector.getType() == SelectorType.HTML) {
                extractedValue = element.html();
            }

            return Optional.ofNullable(extractedValue != null && !extractedValue.isEmpty() ? extractedValue.trim() : null);
        } catch (Exception e) {
            logger.error("Error extracting data for selector '{}' from {}: {}", selector.getName(), selector.getTarget().getUrl(), e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public boolean supportsDynamicContent() {
        return false; // Jsoup is for static content
    }
}
```
package com.alx.scraper.service;

import com.alx.scraper.util.JsoupUtil;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class DataExtractionService {

    /**
     * Extracts structured data from an HTML document based on provided CSS selectors.
     * Uses caching to avoid re-processing the same document if it's identical (though document caching is less common).
     *
     * @param document The Jsoup Document to extract data from.
     * @param selectors A map where keys are desired field names (e.g., "productTitle") and values are CSS selectors.
     * @return A map of extracted data, where keys are field names and values are the extracted text.
     */
    @Cacheable(value = "extractedData", key = "#document.hashCode()") // Basic caching for the result of extraction
    public Map<String, String> extractData(Document document, Map<String, String> selectors) {
        if (document == null || selectors == null || selectors.isEmpty()) {
            return Map.of();
        }

        Map<String, String> extractedData = new HashMap<>();
        for (Map.Entry<String, String> entry : selectors.entrySet()) {
            String fieldName = entry.getKey();
            String cssSelector = entry.getValue();

            Optional<String> value = JsoupUtil.selectFirstText(document, cssSelector);
            value.ifPresent(s -> extractedData.put(fieldName, s));

            if (value.isEmpty()) {
                log.warn("No data found for selector '{}' for field '{}' in document.", cssSelector, fieldName);
            }
        }
        log.debug("Extracted data: {}", extractedData);
        return extractedData;
    }

    /**
     * Finds the URL for the "next page" based on a CSS selector.
     *
     * @param document The current HTML document.
     * @param nextPageSelector CSS selector for the next page link (e.g., "a.next-page").
     * @return The absolute URL of the next page, or empty if not found.
     */
    public Optional<String> findNextPageUrl(Document document, String nextPageSelector) {
        if (document == null || nextPageSelector == null || nextPageSelector.trim().isEmpty()) {
            return Optional.empty();
        }
        return JsoupUtil.selectFirstAttribute(document, nextPageSelector, "abs:href");
    }
}
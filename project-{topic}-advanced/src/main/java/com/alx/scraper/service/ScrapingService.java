package com.alx.scraper.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Core service for performing web scraping operations using Jsoup.
 * This service encapsulates the logic for fetching HTML and extracting data.
 *
 * ALX Focus: Demonstrates practical application of programming logic and
 * algorithm design for web data extraction. Key aspects:
 * - Robust HTTP request handling (connection timeout).
 * - HTML parsing with CSS selectors (efficient data querying).
 * - Structured data extraction and representation (List of Maps).
 * - Error handling for network and parsing issues.
 * - JSON serialization for storage.
 */
@Service
@Slf4j
public class ScrapingService {

    private final ObjectMapper objectMapper;

    @Autowired
    public ScrapingService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /**
     * Fetches HTML content from a given URL and extracts data based on a CSS selector.
     *
     * @param url The target URL to scrape.
     * @param cssSelector The CSS selector to find elements.
     * @return A list of maps, where each map represents an extracted item
     *         and its attributes/text content.
     * @throws IOException If there's a network error or cannot connect.
     * @throws IllegalArgumentException If the URL or selector is invalid.
     */
    public List<Map<String, String>> scrape(String url, String cssSelector) throws IOException {
        if (url == null || url.trim().isEmpty()) {
            throw new IllegalArgumentException("URL cannot be null or empty.");
        }
        if (cssSelector == null || cssSelector.trim().isEmpty()) {
            throw new IllegalArgumentException("CSS selector cannot be null or empty.");
        }

        log.info("Starting scrape for URL: {} with selector: {}", url, cssSelector);
        List<Map<String, String>> scrapedItems = new ArrayList<>();

        try {
            // Connect to the URL and parse the HTML document.
            // Using a user agent to mimic a browser, and a timeout to prevent indefinite waits.
            Document doc = Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
                    .timeout(10 * 1000) // 10 seconds timeout
                    .get();

            // Select elements based on the provided CSS selector.
            Elements elements = doc.select(cssSelector);

            if (elements.isEmpty()) {
                log.warn("No elements found for selector '{}' on URL: {}", cssSelector, url);
            }

            // Iterate through each found element and extract relevant data.
            for (Element element : elements) {
                Map<String, String> itemData = new HashMap<>();

                // Attempt to get the element's own text.
                // text() retrieves the combined text of this element and all its children.
                // ownText() retrieves only the text of this element, not its children.
                String text = element.text().trim();
                if (!text.isEmpty()) {
                    itemData.put("text", text);
                } else {
                    itemData.put("text", element.ownText().trim()); // Fallback to ownText
                }


                // Optionally, extract common attributes like href (for links) or src (for images)
                if (element.hasAttr("href")) {
                    itemData.put("href", element.attr("abs:href")); // abs:href gets the absolute URL
                }
                if (element.hasAttr("src")) {
                    itemData.put("src", element.attr("abs:src")); // abs:src gets the absolute URL
                }
                if (element.hasAttr("alt")) {
                    itemData.put("alt", element.attr("alt"));
                }
                if (element.hasAttr("title")) {
                    itemData.put("title", element.attr("title"));
                }
                // Add all data- attributes
                element.attributes().forEach(attribute -> {
                    if (attribute.getKey().startsWith("data-")) {
                        itemData.put(attribute.getKey(), attribute.getValue());
                    }
                });

                // For more complex scraping, you might need to iterate children elements or
                // use more specific selectors relative to 'element'.
                // Example: If 'element' is a product card, you might do:
                // Elements price = element.select(".product-price");
                // if (!price.isEmpty()) itemData.put("price", price.first().text());

                // Only add if some data was extracted
                if (!itemData.isEmpty()) {
                    scrapedItems.add(itemData);
                }
            }
            log.info("Finished scraping {}. Extracted {} items.", url, scrapedItems.size());
        } catch (IOException e) {
            log.error("Failed to scrape URL: {} with selector: {}. Error: {}", url, cssSelector, e.getMessage());
            throw new IOException("Failed to connect or read from URL: " + url + " - " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("An unexpected error occurred during scraping URL: {} with selector: {}. Error: {}", url, cssSelector, e.getMessage(), e);
            throw new RuntimeException("Unexpected error during scraping: " + e.getMessage(), e);
        }

        return scrapedItems;
    }

    /**
     * Converts a list of scraped data maps into a JSON string.
     *
     * @param scrapedData A list of maps representing the scraped items.
     * @return A JSON string representation of the scraped data.
     * @throws JsonProcessingException If there's an error during JSON serialization.
     */
    public String convertToJson(List<Map<String, String>> scrapedData) throws JsonProcessingException {
        return objectMapper.writeValueAsString(scrapedData);
    }
}
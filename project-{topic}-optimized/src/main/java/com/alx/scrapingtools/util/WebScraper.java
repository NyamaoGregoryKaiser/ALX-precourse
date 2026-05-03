package com.alx.scrapingtools.util;

import com.alx.scrapingtools.scraper.model.ScrapedDataItem;
import com.alx.scrapingtools.scraper.model.ScraperConfig;
import com.alx.scrapingtools.scraper.model.ScrapingJob;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.HttpStatusException;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebScraper {

    private static final int TIMEOUT_MILLIS = 10000; // 10 seconds connection/read timeout

    /**
     * Fetches a web page and parses it using Jsoup.
     * @param url The URL to fetch.
     * @return A Jsoup Document object.
     * @throws IOException if there's a problem connecting or reading from the URL.
     */
    public Document fetchDocument(String url) throws IOException {
        log.info("Fetching URL: {}", url);
        try {
            return Jsoup.connect(url)
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36")
                    .timeout(TIMEOUT_MILLIS)
                    .get();
        } catch (HttpStatusException e) {
            log.error("HTTP error fetching URL {}: {} {}", url, e.getStatusCode(), e.getMessage());
            throw e;
        } catch (SocketTimeoutException e) {
            log.error("Timeout fetching URL {}: {}", url, e.getMessage());
            throw e;
        } catch (IOException e) {
            log.error("IO error fetching URL {}: {}", url, e.getMessage());
            throw e;
        }
    }

    /**
     * Scrapes data from a given document based on the scraper configuration.
     *
     * @param document The Jsoup Document to scrape.
     * @param config The ScraperConfig defining what and how to scrape.
     * @param scrapingJob The current ScrapingJob instance to link data to.
     * @return A list of ScrapedDataItem objects.
     */
    public List<ScrapedDataItem> scrape(Document document, ScraperConfig config, ScrapingJob scrapingJob) {
        List<ScrapedDataItem> scrapedItems = new ArrayList<>();
        if (document == null || config == null || scrapingJob == null) {
            log.warn("Invalid input for scraping: document, config, or scrapingJob is null.");
            return scrapedItems;
        }

        log.debug("Starting scraping for config ID: {} on URL: {}", config.getId(), document.baseUri());

        Elements targetElements = document.select(config.getCssSelectorTarget());
        log.debug("Found {} target elements for selector: {}", targetElements.size(), config.getCssSelectorTarget());

        for (Element element : targetElements) {
            String title = extractText(element, config.getCssSelectorTitle());
            String description = extractText(element, config.getCssSelectorDescription());
            String link = extractLink(element, config.getCssSelectorLink());
            String content = element.text(); // Fallback: full text of the element

            // Only save if at least title or link is found
            if (!Objects.equals(title, "N/A") || !Objects.equals(link, "N/A")) {
                scrapedItems.add(ScrapedDataItem.builder()
                        .scrapingJob(scrapingJob)
                        .scraperConfig(config)
                        .title(title)
                        .description(description)
                        .url(link)
                        .content(content)
                        .build());
            } else {
                log.debug("Skipping item as no title or link found in element: {}", element.html().substring(0, Math.min(element.html().length(), 200)));
            }
        }
        log.info("Finished scraping for config ID: {}. Found {} items.", config.getId(), scrapedItems.size());
        return scrapedItems;
    }

    private String extractText(Element parent, String cssSelector) {
        if (cssSelector == null || cssSelector.isEmpty()) {
            return "N/A";
        }
        Elements elements = parent.select(cssSelector);
        return elements.isEmpty() ? "N/A" : elements.first().text().trim();
    }

    private String extractLink(Element parent, String cssSelector) {
        if (cssSelector == null || cssSelector.isEmpty()) {
            return "N/A";
        }
        Elements elements = parent.select(cssSelector);
        if (elements.isEmpty()) {
            return "N/A";
        }
        Element linkElement = elements.first();
        String href = linkElement.attr("href");
        // Resolve relative URLs to absolute URLs
        if (linkElement.baseUri() != null && !href.startsWith("http")) {
            return linkElement.baseUri() + href;
        }
        return href;
    }
}
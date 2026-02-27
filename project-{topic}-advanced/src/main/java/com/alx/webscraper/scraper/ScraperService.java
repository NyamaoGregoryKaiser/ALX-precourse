```java
package com.alx.webscraper.scraper;

import com.alx.webscraper.model.ScrapedData;
import com.alx.webscraper.model.ScrapingTask;
import com.alx.webscraper.repository.ScrapedDataRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Orchestrates the scraping process. Uses a ScraperStrategy to perform the actual scraping
 * and saves the results to the database.
 */
@Service
public class ScraperService {

    private static final Logger logger = LoggerFactory.getLogger(ScraperService.class);

    private final ScraperStrategy htmlScraper; // Injected specific strategy
    private final ScrapedDataRepository scrapedDataRepository;

    @Autowired
    public ScraperService(HtmlScraper htmlScraper, ScrapedDataRepository scrapedDataRepository) {
        this.htmlScraper = htmlScraper;
        this.scrapedDataRepository = scrapedDataRepository;
    }

    /**
     * Executes a given scraping task using the configured scraper strategy.
     * This method is transactional to ensure data consistency.
     *
     * @param task The scraping task to execute.
     * @return A list of UUIDs of the newly created ScrapedData entries.
     * @throws IOException If the scraping fails due to network or parsing issues.
     */
    @Transactional
    public List<UUID> executeScrapingTask(ScrapingTask task) throws IOException {
        logger.info("Executing scraping task: {} (ID: {}) for URL: {}", task.getName(), task.getId(), task.getTargetUrl());

        if (task.getDataFields() == null || task.getDataFields().isEmpty()) {
            logger.warn("Task ID {} has no data fields defined. Skipping scraping.", task.getId());
            return List.of();
        }

        List<Map<String, String>> extractedRecords = htmlScraper.scrape(task.getTargetUrl(), task.getDataFields());

        List<UUID> savedDataIds = extractedRecords.stream()
                .map(dataMap -> {
                    ScrapedData scrapedData = new ScrapedData();
                    scrapedData.setScrapingTask(task);
                    scrapedData.setData(dataMap);
                    scrapedData.setScrapedAt(LocalDateTime.now());
                    scrapedData.setSourceUrl(task.getTargetUrl());
                    return scrapedDataRepository.save(scrapedData).getId();
                })
                .toList();

        logger.info("Successfully scraped and saved {} data entries for task ID: {}", savedDataIds.size(), task.getId());
        return savedDataIds;
    }
}
```
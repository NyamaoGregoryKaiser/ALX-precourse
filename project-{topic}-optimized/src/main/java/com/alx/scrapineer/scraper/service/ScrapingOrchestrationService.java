```java
package com.alx.scrapineer.scraper.service;

import com.alx.scrapineer.data.entity.JobStatus;
import com.alx.scrapineer.data.entity.ScrapingJob;
import com.alx.scrapineer.data.entity.ScrapingResult;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.repository.ScrapingJobRepository;
import com.alx.scrapineer.data.repository.ScrapingResultRepository;
import com.alx.scrapineer.scraper.engine.ScraperEngine;
import com.alx.scrapineer.scraper.engine.ScraperException;
import com.alx.scrapineer.scraper.strategy.JsoupScraperEngine;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Service responsible for orchestrating the web scraping process.
 * Manages job status updates and result storage.
 */
@Service
@RequiredArgsConstructor
public class ScrapingOrchestrationService {

    private static final Logger logger = LoggerFactory.getLogger(ScrapingOrchestrationService.class);

    private final ScrapingJobRepository jobRepository;
    private final ScrapingResultRepository resultRepository;
    private final JsoupScraperEngine jsoupScraperEngine; // Inject specific engines

    /**
     * Executes a single scraping job asynchronously.
     * This method updates job status, performs scraping, and stores results.
     *
     * @param job The ScrapingJob to execute.
     */
    @Async("taskScheduler") // Run this method in the dedicated scheduler thread pool
    @Transactional
    @CacheEvict(value = {"jobResults", "jobs"}, allEntries = true) // Clear relevant caches
    public void executeScrapingJob(ScrapingJob job) {
        logger.info("Starting scraping job with ID: {} for target: {}", job.getId(), job.getTarget().getName());

        job.setStatus(JobStatus.RUNNING);
        job.setLastRunAt(LocalDateTime.now());
        jobRepository.save(job);

        ScrapingTarget target = job.getTarget();
        ScrapingResult result = ScrapingResult.builder()
                .job(job)
                .target(target)
                .timestamp(LocalDateTime.now())
                .build();

        try {
            // In a real application, you might dynamically choose the engine based on target properties
            // e.g., if (target.requiresDynamicJs) { scraperEngine = seleniumScraperEngine; }
            ScraperEngine scraperEngine = jsoupScraperEngine; // Default to Jsoup for static content

            Map<String, String> extractedData = scraperEngine.scrape(target);
            result.setExtractedData(extractedData);
            result.setSuccessful(true);
            job.setStatus(JobStatus.COMPLETED);
            logger.info("Scraping job {} for target {} completed successfully. Extracted {} items.",
                    job.getId(), target.getName(), extractedData.size());
        } catch (ScraperException e) {
            logger.error("Scraping job {} for target {} failed: {}", job.getId(), target.getName(), e.getMessage(), e);
            result.setSuccessful(false);
            result.setErrorMessage(e.getMessage());
            job.setStatus(JobStatus.FAILED);
        } catch (Exception e) {
            logger.error("An unexpected error occurred during scraping job {} for target {}: {}", job.getId(), target.getName(), e.getMessage(), e);
            result.setSuccessful(false);
            result.setErrorMessage("Unexpected error: " + e.getMessage());
            job.setStatus(JobStatus.FAILED);
        } finally {
            resultRepository.save(result);
            jobRepository.save(job); // Save final job status
        }
    }
}
```
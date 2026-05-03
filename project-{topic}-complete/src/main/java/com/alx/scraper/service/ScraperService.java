package com.alx.scraper.service;

import com.alx.scraper.entity.ScrapedData;
import com.alx.scraper.entity.ScrapingJob;
import com.alx.scraper.repository.ScrapedDataRepository;
import com.alx.scraper.util.JsoupUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Connection;
import org.jsoup.nodes.Document;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.Proxy;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScraperService {

    private final DataExtractionService dataExtractionService;
    private final ProxyService proxyService;
    private final ScrapedDataRepository scrapedDataRepository;

    /**
     * Fetches an HTML document from a URL.
     * Caches the document based on URL to prevent redundant fetches within a short period.
     *
     * @param url The URL to fetch.
     * @return The Jsoup Document.
     * @throws IOException If there's an issue connecting or reading the URL.
     */
    @Cacheable(value = "htmlDocuments", key = "#url")
    public Document fetchDocument(String url) throws IOException {
        log.info("Attempting to fetch document from: {}", url);
        Connection connection = JsoupUtil.getConnection(url, proxyService.getNextProxy());
        try {
            return connection.get();
        } catch (IOException e) {
            log.error("Failed to fetch document from {}: {}", url, e.getMessage());
            // Optionally, report the proxy as bad if it was used and caused the failure
            // proxyService.reportBadProxy(connection.request().proxy());
            throw e; // Re-throw to allow higher-level error handling
        }
    }

    /**
     * Executes a full scraping run for a given job, handling multiple pages if configured.
     *
     * @param job The ScrapingJob to execute.
     * @return A list of ScrapedData objects created during this run.
     */
    @Transactional // Ensures all data for a job is saved or none if an error occurs
    @CachePut(value = "scrapedDataForJob", key = "#job.id") // Update cache with new data for this job
    public List<ScrapedData> performScraping(ScrapingJob job) {
        log.info("Starting scraping job: {} for URL: {}", job.getJobName(), job.getTargetUrl());
        List<ScrapedData> collectedData = new ArrayList<>();
        String currentUrl = job.getTargetUrl();
        int pagesScraped = 0;

        while (currentUrl != null && (job.getMaxPagesToScrape() == null || pagesScraped < job.getMaxPagesToScrape())) {
            if (job.getStatus() == ScrapingStatus.STOPPED || job.getStatus() == ScrapingStatus.FAILED) {
                log.info("Scraping job {} was stopped or failed externally. Aborting.", job.getId());
                break;
            }

            try {
                Document document = fetchDocument(currentUrl);
                Map<String, String> extractedFields = dataExtractionService.extractData(document, job.getSelectors());

                if (!extractedFields.isEmpty()) {
                    ScrapedData scrapedData = new ScrapedData();
                    scrapedData.setScrapingJob(job);
                    scrapedData.setUrl(currentUrl);
                    scrapedData.setExtractedData(extractedFields);
                    scrapedData.setScrapedAt(LocalDateTime.now());
                    collectedData.add(scrapedData);
                    scrapedDataRepository.save(scrapedData); // Save data per page
                } else {
                    log.warn("No data extracted from URL: {} for job: {}", currentUrl, job.getJobName());
                }

                pagesScraped++;
                job.setPagesScrapedCount(pagesScraped); // Update count
                // Only look for next page if maxPagesToScrape is not reached or not set
                if (job.getNextPageSelector() != null && !job.getNextPageSelector().trim().isEmpty() &&
                    (job.getMaxPagesToScrape() == null || pagesScraped < job.getMaxPagesToScrape())) {
                    Optional<String> nextPageUrl = dataExtractionService.findNextPageUrl(document, job.getNextPageSelector());
                    currentUrl = nextPageUrl.orElse(null);
                    if (currentUrl != null) {
                        log.debug("Found next page: {}", currentUrl);
                        // Implement a delay here to be polite and avoid IP bans
                        Thread.sleep(2000); // 2-second delay
                    } else {
                        log.info("No more next pages found for job: {}", job.getJobName());
                    }
                } else {
                    currentUrl = null; // Stop if no next page selector or max pages reached
                }

            } catch (IOException e) {
                log.error("Error during scraping job {} at URL {}: {}", job.getId(), currentUrl, e.getMessage());
                // Handle network errors, HTTP errors, etc.
                job.setStatus(ScrapingStatus.FAILED); // Mark job as failed
                break; // Stop scraping this job
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt(); // Restore interrupt status
                log.warn("Scraping job {} interrupted during sleep at URL {}.", job.getId(), currentUrl);
                job.setStatus(ScrapingStatus.STOPPED); // Mark as stopped due to interruption
                break;
            } catch (Exception e) {
                log.error("Unexpected error during scraping job {} at URL {}: {}", job.getId(), currentUrl, e.getMessage(), e);
                job.setStatus(ScrapingStatus.FAILED);
                break;
            }
        }
        log.info("Completed scraping for job {}. Scraped {} pages.", job.getId(), pagesScraped);
        return collectedData;
    }
}
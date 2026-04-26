package com.alx.scraper.scheduler;

import com.alx.scraper.model.ScrapingJob;
import com.alx.scraper.service.ScrapingJobService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Component responsible for managing the scheduling of scraping jobs.
 * This class ensures that all active jobs with a defined CRON schedule
 * are registered with the Spring TaskScheduler on application startup.
 *
 * ALX Focus: Demonstrates robust job scheduling management in an enterprise context.
 * It's critical to re-schedule jobs after an application restart to maintain
 * continuity of operations. `PostConstruct` is used for initialization logic.
 */
@Component
@Slf4j
public class ScrapingScheduler {

    @Autowired
    private ScrapingJobService scrapingJobService; // Use the service to interact with jobs

    /**
     * Initializes the scheduler by loading all active scraping jobs from the database
     * and scheduling them based on their CRON expressions.
     * This method runs automatically after the bean is constructed.
     *
     * ALX Focus: Ensures system resilience and continuity. Jobs are not lost
     * after application restarts.
     */
    @PostConstruct
    public void init() {
        log.info("Initializing scraping scheduler: Loading and scheduling active jobs...");
        try {
            List<ScrapingJob> activeJobs = scrapingJobService.getActiveScrapingJobs();
            if (activeJobs.isEmpty()) {
                log.info("No active scraping jobs found to schedule at startup.");
            } else {
                for (ScrapingJob job : activeJobs) {
                    if (job.getScheduleCron() != null && !job.getScheduleCron().isEmpty()) {
                        log.info("Found active job '{}' (ID: {}) with CRON: {}. Attempting to schedule.",
                                job.getName(), job.getId(), job.getScheduleCron());
                        try {
                            // The service handles actual scheduling
                            scrapingJobService.scheduleJob(job.getId(), job.getScheduleCron());
                        } catch (Exception e) {
                            log.error("Failed to schedule job '{}' (ID: {}) with CRON '{}': {}",
                                    job.getName(), job.getId(), job.getScheduleCron(), e.getMessage());
                        }
                    } else {
                        log.warn("Active job '{}' (ID: {}) has no CRON expression, skipping scheduling.",
                                job.getName(), job.getId());
                    }
                }
            }
            log.info("Scraping scheduler initialization complete.");
        } catch (Exception e) {
            log.error("Error during scraping scheduler initialization: {}", e.getMessage(), e);
        }
    }
}
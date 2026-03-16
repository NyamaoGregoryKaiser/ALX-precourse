```java
package com.alx.scrapineer.scheduler;

import com.alx.scrapineer.data.entity.JobStatus;
import com.alx.scrapineer.data.entity.ScrapingJob;
import com.alx.scrapineer.data.repository.ScrapingJobRepository;
import com.alx.scrapineer.scraper.service.ScrapingOrchestrationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronExpression;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Component responsible for scheduling and initiating scraping jobs based on CRON expressions.
 */
@Component
@RequiredArgsConstructor
public class ScrapingJobScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ScrapingJobScheduler.class);

    private final ScrapingJobRepository jobRepository;
    private final ScrapingOrchestrationService orchestrationService;

    @Value("${scheduler.enabled:true}")
    private boolean schedulerEnabled;

    @Value("${scheduler.job-check-interval-minutes:5}")
    private int jobCheckIntervalMinutes;

    /**
     * Periodically checks for due scheduled scraping jobs and initiates their execution.
     * Runs every `job-check-interval-minutes`.
     */
    @Scheduled(fixedRateString = "${scheduler.job-check-interval-minutes:5} * 60 * 1000", initialDelay = 5000) // Default every 5 minutes
    @Transactional
    public void scheduleScrapingJobs() {
        if (!schedulerEnabled) {
            logger.debug("Scraping scheduler is disabled.");
            return;
        }

        logger.info("Checking for due scheduled scraping jobs...");
        LocalDateTime now = LocalDateTime.now();

        List<ScrapingJob> dueJobs = jobRepository.findDueScheduledJobs(now);

        if (dueJobs.isEmpty()) {
            logger.info("No due scheduled jobs found at {}", now);
            return;
        }

        logger.info("Found {} due scheduled jobs.", dueJobs.size());

        for (ScrapingJob job : dueJobs) {
            try {
                // Update next run time before executing to prevent immediate re-scheduling
                // (especially important for jobs that take longer than the check interval)
                updateJobNextRunTime(job);
                jobRepository.save(job); // Save the updated nextRunAt
                orchestrationService.executeScrapingJob(job);
            } catch (Exception e) {
                logger.error("Error scheduling or executing job {}: {}", job.getId(), e.getMessage(), e);
                job.setStatus(JobStatus.FAILED); // Mark job as failed if initial setup fails
                jobRepository.save(job);
            }
        }
    }

    /**
     * Calculates and sets the next run time for a scheduled job based on its CRON expression.
     * @param job The ScrapingJob to update.
     */
    public void updateJobNextRunTime(ScrapingJob job) {
        if (job.getScheduleCron() != null && !job.getScheduleCron().trim().isEmpty()) {
            try {
                CronExpression cron = CronExpression.parse(job.getScheduleCron());
                LocalDateTime nextRunTime = cron.next(LocalDateTime.now());
                job.setNextRunAt(nextRunTime);
                job.setStatus(JobStatus.SCHEDULED); // Ensure status is SCHEDULED
                logger.debug("Job {} next run set to: {}", job.getId(), nextRunTime);
            } catch (IllegalArgumentException e) {
                logger.error("Invalid CRON expression for job {}: {}. Setting status to FAILED.", job.getId(), job.getScheduleCron(), e);
                job.setStatus(JobStatus.FAILED);
                job.setNextRunAt(null);
            }
        } else {
            // If no CRON, it's a manual job, clear nextRunAt if it was set
            job.setNextRunAt(null);
        }
    }
}
```
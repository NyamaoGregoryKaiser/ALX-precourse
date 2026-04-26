package com.alx.scraper.service;

import com.alx.scraper.dto.ScrapingJobCreateRequest;
import com.alx.scraper.exception.ResourceNotFoundException;
import com.alx.scraper.model.ScrapedData;
import com.alx.scraper.model.ScrapingJob;
import com.alx.scraper.model.User;
import com.alx.scraper.repository.ScrapedDataRepository;
import com.alx.scraper.repository.ScrapingJobRepository;
import com.alx.scraper.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;

/**
 * Service layer for managing {@link ScrapingJob} entities.
 * Handles CRUD operations, scheduling, and triggering of scraping tasks.
 *
 * ALX Focus: Core business logic for the application.
 * Demonstrates:
 * - CRUD operations with JPA.
 * - Integration with a custom scraping service.
 * - Dynamic scheduling of tasks using Spring's `TaskScheduler` and CRON expressions.
 * - Caching to improve performance (e.g., getting a job by ID).
 * - Transactional management for data consistency.
 * - Robust error handling (ResourceNotFoundException).
 */
@Service
@Slf4j
public class ScrapingJobService {

    @Autowired
    private ScrapingJobRepository scrapingJobRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ScrapedDataRepository scrapedDataRepository;

    @Autowired
    private ScrapingService scrapingService;

    @Autowired
    private TaskScheduler taskScheduler; // For dynamic scheduling

    // Map to hold references to scheduled tasks for dynamic cancellation/rescheduling
    private final Map<Long, ScheduledFuture<?>> scheduledTasks = new ConcurrentHashMap<>();

    /**
     * Creates a new scraping job for a given user.
     *
     * @param userId The ID of the user creating the job.
     * @param request The {@link ScrapingJobCreateRequest} containing job details.
     * @return The created {@link ScrapingJob} entity.
     * @throws ResourceNotFoundException If the user does not exist.
     */
    @Transactional
    public ScrapingJob createScrapingJob(Long userId, ScrapingJobCreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        ScrapingJob job = new ScrapingJob();
        job.setUser(user);
        job.setName(request.getName());
        job.setTargetUrl(request.getTargetUrl());
        job.setCssSelector(request.getCssSelector());
        job.setScheduleCron(request.getScheduleCron());
        job.setStatus(ScrapingJob.JobStatus.ACTIVE); // Default status

        ScrapingJob savedJob = scrapingJobRepository.save(job);
        log.info("Created scraping job: {} for user: {}", savedJob.getName(), user.getUsername());

        // Schedule the job immediately if cron is provided
        if (request.getScheduleCron() != null && !request.getScheduleCron().isEmpty()) {
            scheduleJob(savedJob.getId(), request.getScheduleCron());
        }

        return savedJob;
    }

    /**
     * Retrieves a scraping job by its ID, ensuring it belongs to the specified user.
     * Caches the result to improve performance for frequent lookups.
     *
     * @param jobId The ID of the scraping job.
     * @param userId The ID of the user requesting the job.
     * @return The found {@link ScrapingJob} entity.
     * @throws ResourceNotFoundException If the job is not found or not owned by the user.
     */
    @Cacheable(value = "scrapingJobs", key = "#jobId")
    @Transactional(readOnly = true)
    public ScrapingJob getScrapingJobById(Long jobId, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        return scrapingJobRepository.findByIdAndUser(jobId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping job not found with id: " + jobId + " for user: " + userId));
    }

    /**
     * Retrieves all scraping jobs for a specific user.
     *
     * @param userId The ID of the user.
     * @return A list of {@link ScrapingJob} entities.
     * @throws ResourceNotFoundException If the user does not exist.
     */
    @Transactional(readOnly = true)
    public List<ScrapingJob> getAllScrapingJobsForUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
        return scrapingJobRepository.findByUser(user);
    }

    /**
     * Updates an existing scraping job.
     *
     * @param jobId The ID of the job to update.
     * @param userId The ID of the user owning the job.
     * @param request The {@link ScrapingJobCreateRequest} with updated details.
     * @return The updated {@link ScrapingJob} entity.
     * @throws ResourceNotFoundException If the job is not found or not owned by the user.
     */
    @CacheEvict(value = "scrapingJobs", key = "#jobId") // Evict from cache on update
    @Transactional
    public ScrapingJob updateScrapingJob(Long jobId, Long userId, ScrapingJobCreateRequest request) {
        ScrapingJob existingJob = getScrapingJobById(jobId, userId); // Ensures user owns the job

        existingJob.setName(request.getName());
        existingJob.setTargetUrl(request.getTargetUrl());
        existingJob.setCssSelector(request.getCssSelector());
        existingJob.setScheduleCron(request.getScheduleCron());
        existingJob.setUpdatedAt(LocalDateTime.now());

        // Reschedule if CRON expression changed or was added/removed
        if (request.getScheduleCron() != null && !request.getScheduleCron().isEmpty()) {
            scheduleJob(existingJob.getId(), request.getScheduleCron());
        } else {
            unscheduleJob(existingJob.getId());
        }

        log.info("Updated scraping job: {}", existingJob.getName());
        return scrapingJobRepository.save(existingJob);
    }

    /**
     * Deletes a scraping job and all its associated scraped data.
     *
     * @param jobId The ID of the job to delete.
     * @param userId The ID of the user owning the job.
     * @throws ResourceNotFoundException If the job is not found or not owned by the user.
     */
    @CacheEvict(value = "scrapingJobs", key = "#jobId") // Evict from cache on delete
    @Transactional
    public void deleteScrapingJob(Long jobId, Long userId) {
        ScrapingJob job = getScrapingJobById(jobId, userId); // Ensures user owns the job

        // Unschedule the job before deleting
        unscheduleJob(job.getId());

        // Delete associated scraped data first (if not handled by cascade)
        // scrapedDataRepository.deleteAllByScrapingJob(job); // CascadeType.ALL handles this, but explicit might be safer for large data
        scrapingJobRepository.delete(job);
        log.info("Deleted scraping job: {}", job.getName());
    }

    /**
     * Manually triggers a scraping job for immediate execution.
     *
     * @param jobId The ID of the job to trigger.
     * @param userId The ID of the user owning the job.
     * @return The updated {@link ScrapingJob} entity after execution.
     * @throws ResourceNotFoundException If the job is not found or not owned by the user.
     */
    @Transactional
    public ScrapingJob triggerScrapingJob(Long jobId, Long userId) {
        ScrapingJob job = getScrapingJobById(jobId, userId); // Ensures user owns the job
        log.info("Manually triggering scraping job: {}", job.getName());
        executeScrapingJob(job); // Execute directly
        return job; // Return updated job
    }

    /**
     * Executes the actual scraping logic for a given job.
     * This method fetches the URL, parses content, and saves the data.
     *
     * @param job The {@link ScrapingJob} to execute.
     */
    @Transactional // Ensure that the job status update and data saving are atomic
    public void executeScrapingJob(ScrapingJob job) {
        if (job.getStatus() == ScrapingJob.JobStatus.RUNNING) {
            log.warn("Job {} is already running, skipping execution.", job.getId());
            return;
        }

        job.setStatus(ScrapingJob.JobStatus.RUNNING);
        job.setLastRunAt(LocalDateTime.now());
        scrapingJobRepository.save(job); // Update status to RUNNING

        try {
            List<Map<String, String>> scrapedItems = scrapingService.scrape(job.getTargetUrl(), job.getCssSelector());

            // Convert List<Map> to JSON string for storage
            String jsonData = scrapingService.convertToJson(scrapedItems);

            ScrapedData data = new ScrapedData();
            data.setScrapingJob(job);
            data.setDataJson(jsonData);
            scrapedDataRepository.save(data);

            job.setStatus(ScrapingJob.JobStatus.COMPLETED);
            log.info("Scraping job '{}' (ID: {}) completed successfully. Scraped {} items.", job.getName(), job.getId(), scrapedItems.size());
        } catch (Exception e) {
            job.setStatus(ScrapingJob.JobStatus.FAILED);
            log.error("Scraping job '{}' (ID: {}) failed: {}", job.getName(), job.getId(), e.getMessage(), e);
        } finally {
            // Ensure status is updated even if an error occurs
            if (job.getStatus() == ScrapingJob.JobStatus.RUNNING) { // If it was running but no other status set
                job.setStatus(ScrapingJob.JobStatus.FAILED); // Assume failure if it didn't complete
            }
            scrapingJobRepository.save(job); // Update final status
        }
    }

    /**
     * Schedules a scraping job using its CRON expression.
     * If the job is already scheduled, it will be re-scheduled.
     *
     * @param jobId The ID of the job to schedule.
     * @param cronExpression The CRON expression.
     */
    public void scheduleJob(Long jobId, String cronExpression) {
        unscheduleJob(jobId); // Unschedule if already present

        ScheduledFuture<?> scheduledFuture = taskScheduler.schedule(() -> {
            Optional<ScrapingJob> jobOptional = scrapingJobRepository.findById(jobId);
            jobOptional.ifPresent(this::executeScrapingJob);
        }, new CronTrigger(cronExpression));

        scheduledTasks.put(jobId, scheduledFuture);
        log.info("Job {} scheduled with cron: {}", jobId, cronExpression);
    }

    /**
     * Un-schedules a scraping job if it's currently scheduled.
     *
     * @param jobId The ID of the job to unschedule.
     */
    public void unscheduleJob(Long jobId) {
        ScheduledFuture<?> existingTask = scheduledTasks.remove(jobId);
        if (existingTask != null) {
            existingTask.cancel(true); // Attempt to interrupt if running
            log.info("Job {} unscheduled.", jobId);
        }
    }

    /**
     * Retrieves scraped data for a specific job, with pagination.
     *
     * @param jobId The ID of the scraping job.
     * @param userId The ID of the user owning the job.
     * @param pageable The pagination information.
     * @return A {@link Page} of {@link ScrapedData} entries.
     * @throws ResourceNotFoundException If the job is not found or not owned by the user.
     */
    @Transactional(readOnly = true)
    public Page<ScrapedData> getScrapedDataForJob(Long jobId, Long userId, Pageable pageable) {
        ScrapingJob job = getScrapingJobById(jobId, userId); // Ensures user owns the job
        return scrapedDataRepository.findByScrapingJob(job, pageable);
    }

    /**
     * Retrieves all active jobs to be scheduled on application startup.
     * This method is typically called by a scheduler component.
     *
     * @return A list of active {@link ScrapingJob} entities.
     */
    @Transactional(readOnly = true)
    public List<ScrapingJob> getActiveScrapingJobs() {
        return scrapingJobRepository.findByStatus(ScrapingJob.JobStatus.ACTIVE);
    }
}
```java
package com.alx.scrapineer.service;

import com.alx.scrapineer.api.dto.scraping.ScrapingJobDto;
import com.alx.scrapineer.api.dto.scraping.ScrapingTargetMapping;
import com.alx.scrapineer.common.exception.BadRequestException;
import com.alx.scrapineer.common.exception.ResourceNotFoundException;
import com.alx.scrapineer.data.entity.JobStatus;
import com.alx.scrapineer.data.entity.ScrapingJob;
import com.alx.scrapineer.data.entity.ScrapingTarget;
import com.alx.scrapineer.data.entity.User;
import com.alx.scrapineer.data.repository.ScrapingJobRepository;
import com.alx.scrapineer.data.repository.ScrapingTargetRepository;
import com.alx.scrapineer.scheduler.ScrapingJobScheduler;
import com.alx.scrapineer.scraper.service.ScrapingOrchestrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing ScrapingJob entities.
 */
@Service
@RequiredArgsConstructor
public class ScrapingJobService {

    private final ScrapingJobRepository jobRepository;
    private final ScrapingTargetRepository targetRepository;
    private final ScrapingTargetMapping targetMapping; // Used for converting job related entities to DTOs
    private final ScrapingOrchestrationService orchestrationService;
    private final ScrapingJobScheduler jobScheduler;

    /**
     * Retrieves all scraping jobs for a given user.
     * @param user The authenticated user.
     * @return A list of ScrapingJobDto.
     */
    @Cacheable(value = "jobs", key = "#user.id")
    public List<ScrapingJobDto> getAllJobs(User user) {
        List<ScrapingJob> jobs = jobRepository.findByUser(user);
        return jobs.stream()
                .map(targetMapping::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a single scraping job by ID, ensuring it belongs to the specified user.
     * @param id The ID of the job.
     * @param user The authenticated user.
     * @return The ScrapingJobDto.
     * @throws ResourceNotFoundException if the job is not found or does not belong to the user.
     */
    @Cacheable(value = "jobById", key = "{#id, #user.id}")
    public ScrapingJobDto getJobById(Long id, User user) {
        ScrapingJob job = jobRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping job not found with id " + id));
        return targetMapping.toDto(job);
    }

    /**
     * Creates a new scraping job.
     * @param jobDto The DTO containing job details.
     * @param user The authenticated user.
     * @return The created ScrapingJobDto.
     * @throws ResourceNotFoundException if the target associated with the job is not found.
     */
    @Transactional
    @CacheEvict(value = {"jobs", "jobById", "jobResults"}, allEntries = true)
    public ScrapingJobDto createJob(ScrapingJobDto jobDto, User user) {
        ScrapingTarget target = targetRepository.findByIdAndUser(jobDto.getTargetId(), user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping target not found with id " + jobDto.getTargetId()));

        ScrapingJob job = targetMapping.toEntity(jobDto);
        job.setUser(user);
        job.setTarget(target);
        job.setId(null); // Ensure ID is null for new entity

        if (job.getScheduleCron() != null && !job.getScheduleCron().trim().isEmpty()) {
            jobScheduler.updateJobNextRunTime(job); // Calculate initial next run time
        } else {
            job.setStatus(JobStatus.CREATED); // Manual job
        }

        ScrapingJob savedJob = jobRepository.save(job);
        return targetMapping.toDto(savedJob);
    }

    /**
     * Updates an existing scraping job.
     * @param id The ID of the job to update.
     * @param jobDto The DTO containing updated job details.
     * @param user The authenticated user.
     * @return The updated ScrapingJobDto.
     * @throws ResourceNotFoundException if the job or its associated target is not found.
     */
    @Transactional
    @CacheEvict(value = {"jobs", "jobById", "jobResults"}, allEntries = true)
    public ScrapingJobDto updateJob(Long id, ScrapingJobDto jobDto, User user) {
        ScrapingJob existingJob = jobRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping job not found with id " + id));

        // Only allow update of certain fields
        existingJob.setScheduleCron(jobDto.getScheduleCron());
        existingJob.setStatus(jobDto.getStatus()); // Allow status changes like PAUSED/STOPPED for scheduled jobs

        if (existingJob.getScheduleCron() != null && !existingJob.getScheduleCron().trim().isEmpty()) {
            jobScheduler.updateJobNextRunTime(existingJob);
        } else {
            existingJob.setNextRunAt(null);
            if (existingJob.getStatus() == JobStatus.SCHEDULED) { // Don't allow scheduled status without CRON
                existingJob.setStatus(JobStatus.CREATED);
            }
        }

        ScrapingJob updatedJob = jobRepository.save(existingJob);
        return targetMapping.toDto(updatedJob);
    }

    /**
     * Manually starts a scraping job.
     * @param id The ID of the job to start.
     * @param user The authenticated user.
     * @return The updated ScrapingJobDto.
     * @throws ResourceNotFoundException if the job is not found or does not belong to the user.
     * @throws BadRequestException if the target is inactive or job is already running.
     */
    @Transactional
    @CacheEvict(value = {"jobs", "jobById", "jobResults"}, allEntries = true)
    public ScrapingJobDto startJob(Long id, User user) {
        ScrapingJob job = jobRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping job not found with id " + id));

        if (!job.getTarget().isActive()) {
            throw new BadRequestException("Cannot start job: associated target is inactive.");
        }
        if (job.getStatus() == JobStatus.RUNNING) {
            throw new BadRequestException("Job " + id + " is already running.");
        }

        // For manual start, simply execute without changing scheduleCron
        // The orchestration service will set it to RUNNING, then COMPLETED/FAILED
        orchestrationService.executeScrapingJob(job);
        return targetMapping.toDto(job); // Return updated job state (RUNNING or immediately COMPLETED if async is quick)
    }

    /**
     * Stops a running or scheduled scraping job.
     * @param id The ID of the job to stop.
     * @param user The authenticated user.
     * @return The updated ScrapingJobDto.
     * @throws ResourceNotFoundException if the job is not found or does not belong to the user.
     * @throws BadRequestException if the job is already in a non-stoppable state.
     */
    @Transactional
    @CacheEvict(value = {"jobs", "jobById"}, allEntries = true)
    public ScrapingJobDto stopJob(Long id, User user) {
        ScrapingJob job = jobRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Scraping job not found with id " + id));

        if (job.getStatus() == JobStatus.COMPLETED || job.getStatus() == JobStatus.FAILED || job.getStatus() == JobStatus.STOPPED) {
            throw new BadRequestException("Job " + id + " is already in a terminal state (" + job.getStatus() + ").");
        }

        job.setStatus(JobStatus.STOPPED);
        job.setNextRunAt(null); // Clear next run for stopped scheduled jobs
        ScrapingJob stoppedJob = jobRepository.save(job);
        return targetMapping.toDto(stoppedJob);
    }
}
```
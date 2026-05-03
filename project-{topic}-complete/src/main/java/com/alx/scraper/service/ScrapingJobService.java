package com.alx.scraper.service;

import com.alx.scraper.dto.ScrapedDataDTO;
import com.alx.scraper.dto.ScrapingJobCreateDTO;
import com.alx.scraper.dto.ScrapingJobDTO;
import com.alx.scraper.entity.ScrapedData;
import com.alx.scraper.entity.ScrapingJob;
import com.alx.scraper.entity.ScrapingStatus;
import com.alx.scraper.entity.User;
import com.alx.scraper.exception.ResourceNotFoundException;
import com.alx.scraper.repository.ScrapedDataRepository;
import com.alx.scraper.repository.ScrapingJobRepository;
import com.alx.scraper.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.task.TaskExecutor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Future;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScrapingJobService {

    private final ScrapingJobRepository scrapingJobRepository;
    private final UserRepository userRepository;
    private final ScrapedDataRepository scrapedDataRepository;
    private final ScraperService scraperService;
    private final TaskExecutor taskExecutor; // For asynchronous job execution

    // Map to keep track of running tasks, allowing for cancellation
    private final ConcurrentHashMap<Long, Future<?>> runningJobs = new ConcurrentHashMap<>();

    @Transactional
    public ScrapingJobDTO createScrapingJob(ScrapingJobCreateDTO createDTO) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        ScrapingJob job = new ScrapingJob();
        job.setJobName(createDTO.getJobName());
        job.setTargetUrl(createDTO.getTargetUrl());
        job.setDescription(createDTO.getDescription());
        job.setSelectors(createDTO.getSelectors());
        job.setStatus(ScrapingStatus.CREATED);
        job.setUser(currentUser);
        job.setMaxPagesToScrape(createDTO.getMaxPagesToScrape());
        job.setNextPageSelector(createDTO.getNextPageSelector());

        job = scrapingJobRepository.save(job);
        log.info("Created new scraping job with ID: {} for user: {}", job.getId(), username);
        return mapToDTO(job);
    }

    @Cacheable(value = "scrapingJob", key = "#id")
    public ScrapingJobDTO getScrapingJobById(Long id) {
        ScrapingJob job = getJobOwnedByUser(id);
        return mapToDTO(job);
    }

    @Cacheable(value = "allScrapingJobsForUser", key = "#root.methodName + '_' + T(org.springframework.security.core.context.SecurityContextHolder).getContext().getAuthentication().getName()")
    public List<ScrapingJobDTO> getAllScrapingJobs() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        List<ScrapingJob> jobs = scrapingJobRepository.findByUserId(currentUser.getId());
        return jobs.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = "scrapingJob", key = "#id") // Evict individual job cache
    @CacheEvict(value = "allScrapingJobsForUser", allEntries = true) // Evict all jobs list cache
    public ScrapingJobDTO updateScrapingJob(Long id, ScrapingJobCreateDTO updateDTO) {
        ScrapingJob job = getJobOwnedByUser(id);

        // Only update if job is not running
        if (job.getStatus() != ScrapingStatus.RUNNING) {
            job.setJobName(updateDTO.getJobName());
            job.setTargetUrl(updateDTO.getTargetUrl());
            job.setDescription(updateDTO.getDescription());
            job.setSelectors(updateDTO.getSelectors());
            job.setMaxPagesToScrape(updateDTO.getMaxPagesToScrape());
            job.setNextPageSelector(updateDTO.getNextPageSelector());
            job = scrapingJobRepository.save(job);
            log.info("Updated scraping job with ID: {}", job.getId());
        } else {
            log.warn("Attempted to update running job with ID: {}. Operation denied.", job.getId());
            throw new IllegalStateException("Cannot update a job that is currently running.");
        }
        return mapToDTO(job);
    }

    @Transactional
    @CacheEvict(value = {"scrapingJob", "scrapedDataForJob"}, key = "#id", allEntries = true) // Evict job and its data
    @CacheEvict(value = "allScrapingJobsForUser", allEntries = true) // Evict all jobs list cache
    public void deleteScrapingJob(Long id) {
        ScrapingJob job = getJobOwnedByUser(id);
        if (job.getStatus() == ScrapingStatus.RUNNING) {
            log.warn("Attempted to delete running job with ID: {}. Stopping first.", id);
            stopScrapingJob(id); // Attempt to stop before deleting
        }
        // Associated ScrapedData will be deleted via CascadeType.ALL and orphanRemoval=true
        scrapingJobRepository.delete(job);
        runningJobs.remove(id); // Ensure it's removed from running jobs map
        log.info("Deleted scraping job with ID: {}", id);
    }

    @Transactional
    @CacheEvict(value = {"scrapingJob", "allScrapingJobsForUser"}, allEntries = true) // Evict affected caches
    public ScrapingJobDTO startScrapingJob(Long id) {
        ScrapingJob job = getJobOwnedByUser(id);

        if (job.getStatus() == ScrapingStatus.RUNNING) {
            throw new IllegalStateException("Job is already running.");
        }

        job.setStatus(ScrapingStatus.RUNNING);
        job.setStartedAt(LocalDateTime.now());
        job.setCompletedAt(null); // Clear previous completion time if re-running
        job.setPagesScrapedCount(0); // Reset page count
        scrapingJobRepository.save(job);
        log.info("Starting scraping job with ID: {}", id);

        // Execute scraping in a separate thread/task
        Future<?> future = taskExecutor.submit(() -> {
            try {
                // The actual scraping logic
                scraperService.performScraping(job);
                // After scraping, update job status based on final state in the scraper service
                // Need to re-fetch job to get latest status (e.g., FAILED if an error occurred)
                Optional<ScrapingJob> updatedJobOpt = scrapingJobRepository.findById(job.getId());
                updatedJobOpt.ifPresent(updatedJob -> {
                    if (updatedJob.getStatus() == ScrapingStatus.RUNNING) { // If not already failed/stopped by scraper
                        updatedJob.setStatus(ScrapingStatus.COMPLETED);
                        updatedJob.setCompletedAt(LocalDateTime.now());
                        scrapingJobRepository.save(updatedJob);
                        log.info("Scraping job {} completed successfully.", updatedJob.getId());
                    } else {
                        log.warn("Scraping job {} finished with status {}. No further status update from service.", updatedJob.getId(), updatedJob.getStatus());
                    }
                });
            } catch (Exception e) {
                log.error("Error executing scraping job {}: {}", job.getId(), e.getMessage(), e);
                job.setStatus(ScrapingStatus.FAILED);
                scrapingJobRepository.save(job);
            } finally {
                runningJobs.remove(job.getId()); // Remove from map once done (success or failure)
            }
        });
        runningJobs.put(id, future);
        return mapToDTO(job);
    }

    @Transactional
    @CacheEvict(value = {"scrapingJob", "allScrapingJobsForUser"}, allEntries = true) // Evict affected caches
    public ScrapingJobDTO stopScrapingJob(Long id) {
        ScrapingJob job = getJobOwnedByUser(id);

        if (job.getStatus() != ScrapingStatus.RUNNING && job.getStatus() != ScrapingStatus.PAUSED) {
            throw new IllegalStateException("Job is not running or paused.");
        }

        Future<?> future = runningJobs.get(id);
        if (future != null) {
            // Attempt to interrupt the thread
            boolean cancelled = future.cancel(true); // true means interrupt if running
            if (cancelled) {
                log.info("Attempted to stop/cancel running job: {}. Interrupt initiated.", id);
            } else {
                log.warn("Failed to cancel running job: {}. It might have already completed or is in an uninterruptible state.", id);
            }
        }
        runningJobs.remove(id); // Remove from map regardless

        job.setStatus(ScrapingStatus.STOPPED);
        job.setCompletedAt(LocalDateTime.now()); // Mark completion (stopped) time
        scrapingJobRepository.save(job);
        log.info("Stopped scraping job with ID: {}", id);
        return mapToDTO(job);
    }

    @Cacheable(value = "scrapedDataForJob", key = "#jobId")
    public List<ScrapedDataDTO> getScrapedDataForJob(Long jobId) {
        // Ensure the user owns the job before fetching data
        getJobOwnedByUser(jobId);
        List<ScrapedData> data = scrapedDataRepository.findByScrapingJobId(jobId);
        return data.stream().map(this::mapToDTO).collect(Collectors.toList());
    }

    @Cacheable(value = "scrapedDataEntry", key = "#id")
    public ScrapedDataDTO getScrapedDataById(Long id) {
        ScrapedData data = scrapedDataRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("ScrapedData", "id", id));
        // Verify ownership indirectly via job
        getJobOwnedByUser(data.getScrapingJob().getId());
        return mapToDTO(data);
    }

    // --- Scheduled tasks ---
    // This example starts all jobs marked as CREATED and not yet run, periodically.
    // In a real system, you might trigger based on user action or a more advanced scheduler.
    @Scheduled(fixedRate = 3600000) // Run every hour (3600 seconds * 1000 ms)
    @Transactional // Ensure state changes are atomic
    public void startPendingJobs() {
        log.info("Scheduled task: Checking for pending scraping jobs...");
        List<ScrapingJob> pendingJobs = scrapingJobRepository.findByStatus(ScrapingStatus.CREATED);
        for (ScrapingJob job : pendingJobs) {
            if (!runningJobs.containsKey(job.getId())) { // Only start if not already managed by the map
                try {
                    log.info("Automatically starting pending job: {}", job.getId());
                    startScrapingJob(job.getId()); // Call the service method to ensure proper status updates and async execution
                } catch (Exception e) {
                    log.error("Failed to automatically start job {}: {}", job.getId(), e.getMessage());
                    job.setStatus(ScrapingStatus.FAILED);
                    scrapingJobRepository.save(job);
                }
            }
        }
    }

    // Helper to ensure job ownership
    private ScrapingJob getJobOwnedByUser(Long jobId) {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", username));

        ScrapingJob job = scrapingJobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("ScrapingJob", "id", jobId));

        // Check if the current user owns this job or if the user is an ADMIN
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = authentication.getAuthorities().stream()
                                      .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        if (!job.getUser().getId().equals(currentUser.getId()) && !isAdmin) {
            throw new org.springframework.security.access.AccessDeniedException("User is not authorized to access this scraping job.");
        }
        return job;
    }

    // --- DTO Mappers ---
    private ScrapingJobDTO mapToDTO(ScrapingJob job) {
        ScrapingJobDTO dto = new ScrapingJobDTO();
        dto.setId(job.getId());
        dto.setJobName(job.getJobName());
        dto.setTargetUrl(job.getTargetUrl());
        dto.setDescription(job.getDescription());
        dto.setSelectors(job.getSelectors());
        dto.setStatus(job.getStatus());
        dto.setCreatedAt(job.getCreatedAt());
        dto.setStartedAt(job.getStartedAt());
        dto.setCompletedAt(job.getCompletedAt());
        dto.setUserId(job.getUser().getId());
        dto.setMaxPagesToScrape(job.getMaxPagesToScrape());
        dto.setNextPageSelector(job.getNextPageSelector());
        dto.setPagesScrapedCount(job.getPagesScrapedCount());
        dto.setDataEntriesCount(scrapedDataRepository.countByScrapingJobId(job.getId())); // Add count of scraped data
        return dto;
    }

    private ScrapedDataDTO mapToDTO(ScrapedData data) {
        ScrapedDataDTO dto = new ScrapedDataDTO();
        dto.setId(data.getId());
        dto.setJobId(data.getScrapingJob().getId());
        dto.setUrl(data.getUrl());
        dto.setExtractedData(data.getExtractedData());
        dto.setScrapedAt(data.getScrapedAt());
        return dto;
    }
}
```java
package com.alx.webscraper.service;

import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.exception.ResourceNotFoundException;
import com.alx.webscraper.model.ScrapedData;
import com.alx.webscraper.model.ScrapingTask;
import com.alx.webscraper.model.ScrapingTaskStatus;
import com.alx.webscraper.model.dto.ScrapedDataDTO;
import com.alx.webscraper.model.dto.ScrapingTaskCreateDTO;
import com.alx.webscraper.model.dto.ScrapingTaskResponseDTO;
import com.alx.webscraper.model.dto.ScrapingTaskUpdateDTO;
import com.alx.webscraper.model.util.MappingUtil;
import com.alx.webscraper.repository.ScrapedDataRepository;
import com.alx.webscraper.repository.ScrapingTaskRepository;
import com.alx.webscraper.scraper.ScraperScheduler;
import com.alx.webscraper.scraper.ScraperService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service layer for managing scraping tasks.
 * Handles business logic, interacts with repositories, and orchestrates scraping/scheduling.
 */
@Service
public class ScrapingTaskService {

    private static final Logger logger = LoggerFactory.getLogger(ScrapingTaskService.class);

    private final ScrapingTaskRepository scrapingTaskRepository;
    private final ScrapedDataRepository scrapedDataRepository;
    private final ScraperService scraperService;
    private final ScraperScheduler scraperScheduler;

    public ScrapingTaskService(ScrapingTaskRepository scrapingTaskRepository,
                               ScrapedDataRepository scrapedDataRepository,
                               ScraperService scraperService,
                               ScraperScheduler scraperScheduler) {
        this.scrapingTaskRepository = scrapingTaskRepository;
        this.scrapedDataRepository = scrapedDataRepository;
        this.scraperService = scraperService;
        this.scraperScheduler = scraperScheduler;
    }

    /**
     * Creates a new scraping task for a given user.
     *
     * @param createDTO The DTO containing task creation data.
     * @param user      The authenticated user creating the task.
     * @return The created ScrapingTaskResponseDTO.
     */
    @Transactional
    public ScrapingTaskResponseDTO createTask(ScrapingTaskCreateDTO createDTO, User user) {
        logger.info("Creating new scraping task for user ID: {}", user.getId());
        ScrapingTask task = MappingUtil.toEntity(createDTO, user);
        task = scrapingTaskRepository.save(task);

        if (createDTO.getCronExpression() != null && !createDTO.getCronExpression().isBlank()) {
            task.setStatus(ScrapingTaskStatus.SCHEDULED);
            scrapingTaskRepository.save(task); // Update status
            scraperScheduler.scheduleTask(task); // Schedule the task
        } else {
            task.setStatus(ScrapingTaskStatus.PENDING); // Default status
            scrapingTaskRepository.save(task);
        }

        logger.info("Scraping task ID {} created successfully.", task.getId());
        return MappingUtil.toDto(task);
    }

    /**
     * Retrieves a scraping task by its ID, ensuring it belongs to the specified user.
     *
     * @param id   The ID of the task.
     * @param user The authenticated user.
     * @return The ScrapingTaskResponseDTO.
     * @throws ResourceNotFoundException If the task is not found or doesn't belong to the user.
     */
    @Cacheable(value = "scrapingTasks", key = "#id")
    public ScrapingTaskResponseDTO getTaskById(UUID id, User user) {
        logger.debug("Attempting to retrieve scraping task ID: {} for user ID: {}", id, user.getId());
        ScrapingTask task = scrapingTaskRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> {
                    logger.warn("Scraping task ID {} not found or not owned by user ID {}", id, user.getId());
                    return new ResourceNotFoundException("Scraping task not found with id " + id);
                });
        return MappingUtil.toDto(task);
    }

    /**
     * Retrieves all scraping tasks for a given user.
     *
     * @param user The authenticated user.
     * @return A list of ScrapingTaskResponseDTOs.
     */
    public List<ScrapingTaskResponseDTO> getAllTasksForUser(User user) {
        logger.debug("Retrieving all scraping tasks for user ID: {}", user.getId());
        return scrapingTaskRepository.findByUser(user).stream()
                .map(MappingUtil::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing scraping task.
     *
     * @param id        The ID of the task to update.
     * @param updateDTO The DTO containing update data.
     * @param user      The authenticated user.
     * @return The updated ScrapingTaskResponseDTO.
     * @throws ResourceNotFoundException If the task is not found or doesn't belong to the user.
     */
    @Transactional
    @CachePut(value = "scrapingTasks", key = "#id")
    public ScrapingTaskResponseDTO updateTask(UUID id, ScrapingTaskUpdateDTO updateDTO, User user) {
        logger.info("Updating scraping task ID: {} for user ID: {}", id, user.getId());
        ScrapingTask existingTask = scrapingTaskRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> {
                    logger.warn("Scraping task ID {} not found for update or not owned by user ID {}", id, user.getId());
                    return new ResourceNotFoundException("Scraping task not found with id " + id);
                });

        // Store old cron and status for comparison
        String oldCron = existingTask.getCronExpression();
        ScrapingTaskStatus oldStatus = existingTask.getStatus();

        MappingUtil.updateEntityFromDto(existingTask, updateDTO);

        // Handle cron expression changes
        if (!existingTask.getCronExpression().equals(oldCron)) {
            if (existingTask.getCronExpression() != null && !existingTask.getCronExpression().isBlank()) {
                existingTask.setStatus(ScrapingTaskStatus.SCHEDULED);
            } else {
                existingTask.setStatus(ScrapingTaskStatus.PENDING);
                scraperScheduler.unscheduleTask(existingTask.getId()); // Unschedule if cron is removed
            }
        }

        // Handle status changes (if not already handled by cron change)
        if (updateDTO.getStatus() != null && updateDTO.getStatus() != oldStatus) {
            existingTask.setStatus(updateDTO.getStatus());
        }

        ScrapingTask updatedTask = scrapingTaskRepository.save(existingTask);

        // Reschedule/unschedule based on new status/cron
        if (updatedTask.getStatus() == ScrapingTaskStatus.SCHEDULED && updatedTask.getCronExpression() != null) {
            scraperScheduler.scheduleTask(updatedTask);
        } else if (updatedTask.getStatus() == ScrapingTaskStatus.STOPPED || updatedTask.getStatus() == ScrapingTaskStatus.DISABLED) {
            scraperScheduler.unscheduleTask(updatedTask.getId());
        }

        logger.info("Scraping task ID {} updated successfully.", id);
        return MappingUtil.toDto(updatedTask);
    }

    /**
     * Deletes a scraping task and all its associated scraped data.
     *
     * @param id   The ID of the task to delete.
     * @param user The authenticated user.
     * @throws ResourceNotFoundException If the task is not found or doesn't belong to the user.
     */
    @Transactional
    @CacheEvict(value = "scrapingTasks", key = "#id")
    public void deleteTask(UUID id, User user) {
        logger.info("Deleting scraping task ID: {} for user ID: {}", id, user.getId());
        ScrapingTask task = scrapingTaskRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> {
                    logger.warn("Scraping task ID {} not found for deletion or not owned by user ID {}", id, user.getId());
                    return new ResourceNotFoundException("Scraping task not found with id " + id);
                });

        // First, unschedule if it was scheduled
        scraperScheduler.unscheduleTask(task.getId());

        // Then, delete associated scraped data
        long deletedDataCount = scrapedDataRepository.deleteByScrapingTask(task);
        logger.info("Deleted {} scraped data entries for task ID {}", deletedDataCount, id);

        // Finally, delete the task itself
        scrapingTaskRepository.delete(task);
        logger.info("Scraping task ID {} deleted successfully.", id);
    }

    /**
     * Manually triggers an immediate execution of a scraping task.
     *
     * @param id   The ID of the task to execute.
     * @param user The authenticated user.
     * @throws ResourceNotFoundException If the task is not found or doesn't belong to the user.
     * @throws IOException               If the scraping process encounters an I/O error.
     */
    @Transactional
    public ScrapingTaskResponseDTO triggerTaskExecution(UUID id, User user) throws IOException {
        logger.info("Manually triggering execution for task ID: {} by user ID: {}", id, user.getId());
        ScrapingTask task = scrapingTaskRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> {
                    logger.warn("Scraping task ID {} not found for manual trigger or not owned by user ID {}", id, user.getId());
                    return new ResourceNotFoundException("Scraping task not found with id " + id);
                });

        // Update task status and last run info
        ScrapingTaskStatus originalStatus = task.getStatus();
        task.setStatus(ScrapingTaskStatus.RUNNING);
        task.setLastRunAt(LocalDateTime.now());
        task.setLastRunMessage("Manually triggered execution started...");
        scrapingTaskRepository.save(task);

        try {
            scraperService.executeScrapingTask(task);
            task.setStatus(originalStatus); // Revert to original status (e.g., SCHEDULED or PENDING)
            task.setLastRunMessage("Manually triggered execution completed successfully at " + LocalDateTime.now());
            logger.info("Manual execution for task ID {} completed successfully.", id);
        } catch (IOException e) {
            logger.error("Manual execution for task ID {} failed: {}", id, e.getMessage(), e);
            task.setStatus(ScrapingTaskStatus.FAILED);
            task.setLastRunMessage("Manual execution failed: " + e.getMessage());
            throw e; // Re-throw to be caught by global exception handler
        } catch (Exception e) {
            logger.error("Manual execution for task ID {} failed with unexpected error: {}", id, e.getMessage(), e);
            task.setStatus(ScrapingTaskStatus.FAILED);
            task.setLastRunMessage("Manual execution failed with unexpected error: " + e.getMessage());
            throw new IOException("Unexpected error during scraping: " + e.getMessage(), e);
        } finally {
            scrapingTaskRepository.save(task); // Ensure final status is persisted
        }

        return MappingUtil.toDto(task);
    }

    /**
     * Retrieves paginated scraped data for a specific task and user.
     *
     * @param taskId   The ID of the scraping task.
     * @param user     The authenticated user.
     * @param pageable Pagination information (page number, size, sort).
     * @return A page of ScrapedDataDTOs.
     * @throws ResourceNotFoundException If the task is not found or doesn't belong to the user.
     */
    public Page<ScrapedDataDTO> getScrapedDataForTask(UUID taskId, User user, Pageable pageable) {
        logger.debug("Retrieving scraped data for task ID: {} for user ID: {} (Page: {}, Size: {})",
                taskId, user.getId(), pageable.getPageNumber(), pageable.getPageSize());

        ScrapingTask task = scrapingTaskRepository.findByIdAndUser(taskId, user)
                .orElseThrow(() -> {
                    logger.warn("Scraping task ID {} not found for data retrieval or not owned by user ID {}", taskId, user.getId());
                    return new ResourceNotFoundException("Scraping task not found with id " + taskId);
                });

        return scrapedDataRepository.findByScrapingTask(task, pageable)
                .map(MappingUtil::toDto);
    }
}
```
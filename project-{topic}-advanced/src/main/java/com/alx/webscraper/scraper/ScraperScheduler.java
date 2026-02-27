```java
package com.alx.webscraper.scraper;

import com.alx.webscraper.model.ScrapingTask;
import com.alx.webscraper.model.ScrapingTaskStatus;
import com.alx.webscraper.repository.ScrapingTaskRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.TriggerContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.support.CronTrigger;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ScheduledFuture;

/**
 * Manages the scheduling and execution of scraping tasks based on their cron expressions.
 * Uses Spring's `TaskScheduler` to dynamically schedule and reschedule tasks.
 */
@Component
public class ScraperScheduler implements DisposableBean {

    private static final Logger logger = LoggerFactory.getLogger(ScraperScheduler.class);

    private final ScrapingTaskRepository scrapingTaskRepository;
    private final ScraperService scraperService;
    private final TaskScheduler taskScheduler;
    private final ApplicationContext applicationContext; // To get self-proxy for transactional methods

    // Map to hold scheduled tasks, allowing cancellation and rescheduling
    private final Map<String, ScheduledFuture<?>> scheduledTasks = new HashMap<>();

    @Autowired
    public ScraperScheduler(ScrapingTaskRepository scrapingTaskRepository,
                            ScraperService scraperService,
                            TaskScheduler taskScheduler,
                            ApplicationContext applicationContext) {
        this.scrapingTaskRepository = scrapingTaskRepository;
        this.scraperService = scraperService;
        this.taskScheduler = taskScheduler;
        this.applicationContext = applicationContext;
    }

    /**
     * Initializes all active scheduled tasks on application startup.
     * This method runs once after the application context is fully loaded.
     */
    @Scheduled(initialDelay = 5000, fixedRate = Long.MAX_VALUE) // Run once after 5 seconds
    public void initializeScheduledTasks() {
        logger.info("Initializing scheduled tasks...");
        List<ScrapingTask> activeScheduledTasks = scrapingTaskRepository
                .findByStatusAndCronExpressionIsNotNull(ScrapingTaskStatus.SCHEDULED);

        activeScheduledTasks.forEach(this::scheduleTask);
        logger.info("Initialized {} scheduled tasks.", activeScheduledTasks.size());
    }

    /**
     * Schedules a single scraping task based on its cron expression.
     * If the task is already scheduled, it will be cancelled and rescheduled.
     *
     * @param task The scraping task to schedule.
     */
    public void scheduleTask(ScrapingTask task) {
        if (task.getCronExpression() == null || task.getCronExpression().isBlank()) {
            logger.warn("Task ID {} has no cron expression. Not scheduling.", task.getId());
            unscheduleTask(task.getId()); // Ensure it's not lingering if cron was removed
            return;
        }
        if (task.getStatus() != ScrapingTaskStatus.SCHEDULED) {
            logger.warn("Task ID {} status is {}. Only SCHEDULED tasks can be actively scheduled.",
                    task.getId(), task.getStatus());
            unscheduleTask(task.getId()); // Remove if it's not in the correct state
            return;
        }

        // Cancel existing task if already scheduled
        unscheduleTask(task.getId());

        CronTrigger trigger = new CronTrigger(task.getCronExpression());
        logger.info("Scheduling task ID {} with cron expression: {}", task.getId(), task.getCronExpression());

        // Get a transactional self-proxy to ensure executeAndLogTask is transactional
        ScraperScheduler self = applicationContext.getBean(ScraperScheduler.class);

        ScheduledFuture<?> future = taskScheduler.schedule(() -> self.executeAndLogTask(task.getId()),
                (TriggerContext triggerContext) -> {
                    Date lastCompletionTime = triggerContext.lastCompletionTime();
                    Date lastScheduledExecutionTime = triggerContext.lastScheduledExecutionTime();
                    Date lastActualExecutionTime = triggerContext.lastActualExecutionTime();

                    logger.debug("Calculating next execution for task ID {}. Last completion: {}, Scheduled: {}, Actual: {}",
                            task.getId(), lastCompletionTime, lastScheduledExecutionTime, lastActualExecutionTime);

                    return trigger.nextExecutionTime(triggerContext);
                });
        scheduledTasks.put(task.getId().toString(), future);
        logger.info("Task ID {} successfully scheduled.", task.getId());
    }

    /**
     * Unschedules a task given its ID.
     * @param taskId The ID of the task to unschedule.
     */
    public void unscheduleTask(UUID taskId) {
        ScheduledFuture<?> future = scheduledTasks.remove(taskId.toString());
        if (future != null) {
            future.cancel(false); // Do not interrupt if running
            logger.info("Task ID {} unscheduled.", taskId);
        }
    }

    /**
     * Executes a scraping task and logs its outcome, updating the task status and timestamps.
     * This method needs to be public for Spring's AOP (e.g., @Transactional) to work on it when called by a scheduled task.
     *
     * @param taskId The ID of the task to execute.
     */
    @Transactional // Ensure the task status update and data saving are atomic
    public void executeAndLogTask(UUID taskId) {
        Optional<ScrapingTask> optionalTask = scrapingTaskRepository.findById(taskId);
        if (optionalTask.isEmpty()) {
            logger.error("Attempted to execute non-existent task with ID: {}", taskId);
            unscheduleTask(taskId); // Remove from scheduler if it no longer exists
            return;
        }

        ScrapingTask task = optionalTask.get();

        if (task.getStatus() != ScrapingTaskStatus.SCHEDULED && task.getStatus() != ScrapingTaskStatus.RUNNING) {
            logger.warn("Task ID {} is not in SCHEDULED or RUNNING state (current: {}). Skipping execution.",
                    taskId, task.getStatus());
            // If it's not SCHEDULED, remove it from the active scheduler map,
            // as it shouldn't be executed via cron.
            unscheduleTask(taskId);
            return;
        }

        logger.info("Starting scheduled execution for task: {} (ID: {})", task.getName(), task.getId());

        task.setStatus(ScrapingTaskStatus.RUNNING);
        task.setLastRunAt(LocalDateTime.now());
        task.setLastRunMessage("Running...");
        scrapingTaskRepository.save(task); // Update status to RUNNING

        try {
            scraperService.executeScrapingTask(task);
            task.setStatus(ScrapingTaskStatus.SCHEDULED); // Revert to SCHEDULED after successful run
            task.setLastRunMessage("Successfully completed at " + LocalDateTime.now());
            logger.info("Scheduled task ID {} completed successfully.", taskId);
        } catch (IOException e) {
            logger.error("Failed to execute scheduled task ID {}: {}", taskId, e.getMessage());
            task.setStatus(ScrapingTaskStatus.FAILED);
            task.setLastRunMessage("Failed: " + e.getMessage());
        } catch (Exception e) {
            logger.error("An unexpected error occurred during scheduled task ID {}: {}", taskId, e.getMessage(), e);
            task.setStatus(ScrapingTaskStatus.FAILED);
            task.setLastRunMessage("Failed with unexpected error: " + e.getMessage());
        } finally {
            scrapingTaskRepository.save(task); // Save final status and message
        }
    }


    /**
     * Cleans up all scheduled tasks when the application is shutting down.
     */
    @Override
    public void destroy() {
        logger.info("Shutting down ScraperScheduler, cancelling all {} active tasks.", scheduledTasks.size());
        scheduledTasks.values().forEach(future -> future.cancel(true));
        scheduledTasks.clear();
        logger.info("All scheduled tasks cancelled.");
    }
}
```
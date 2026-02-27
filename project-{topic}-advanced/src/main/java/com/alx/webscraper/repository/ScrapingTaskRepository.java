```java
package com.alx.webscraper.repository;

import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.model.ScrapingTask;
import com.alx.webscraper.model.ScrapingTaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for managing ScrapingTask entities.
 * Extends JpaRepository for basic CRUD and pagination operations.
 */
@Repository
public interface ScrapingTaskRepository extends JpaRepository<ScrapingTask, UUID> {

    /**
     * Finds all scraping tasks owned by a specific user.
     * @param user The user whose tasks to retrieve.
     * @return A list of ScrapingTask entities.
     */
    List<ScrapingTask> findByUser(User user);

    /**
     * Finds a scraping task by its ID and ensures it belongs to the specified user.
     * @param id The ID of the scraping task.
     * @param user The user who owns the task.
     * @return An Optional containing the ScrapingTask if found and owned by the user, otherwise empty.
     */
    Optional<ScrapingTask> findByIdAndUser(UUID id, User user);

    /**
     * Finds all scraping tasks that are scheduled (have a cron expression) and are not stopped/disabled.
     * @param status The status of tasks to retrieve.
     * @return A list of scheduled ScrapingTask entities.
     */
    List<ScrapingTask> findByStatusAndCronExpressionIsNotNull(ScrapingTaskStatus status);
}
```
```java
package com.alx.taskmgr.repository;

import com.alx.taskmgr.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for {@link Task} entities.
 * Extends Spring Data JPA's JpaRepository to provide standard CRUD operations
 * and custom query methods for tasks.
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    /**
     * Finds all tasks owned by a specific user (identified by owner ID).
     *
     * @param ownerId The ID of the user who owns the tasks.
     * @return A list of tasks owned by the specified user.
     */
    List<Task> findByOwnerId(Long ownerId);

    /**
     * Finds a task by its ID and ensures it is owned by a specific user.
     * This is crucial for security to prevent users from accessing tasks they don't own.
     *
     * @param taskId The ID of the task.
     * @param ownerId The ID of the user who is expected to own the task.
     * @return An Optional containing the found Task if it matches both IDs, or empty if not found or not owned by the user.
     */
    Optional<Task> findByIdAndOwnerId(Long taskId, Long ownerId);
}
```
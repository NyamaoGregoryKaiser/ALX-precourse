```java
package com.alx.taskmgr.repository;

import com.alx.taskmgr.model.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserId(Long userId);
    Optional<Task> findByIdAndUserId(Long id, Long userId);
    List<Task> findByUserIdAndCompleted(Long userId, boolean completed);
    List<Task> findByUserIdAndDueDateBefore(Long userId, LocalDate date);
    List<Task> findByUserIdAndCategoryId(Long userId, Long categoryId);
}
```
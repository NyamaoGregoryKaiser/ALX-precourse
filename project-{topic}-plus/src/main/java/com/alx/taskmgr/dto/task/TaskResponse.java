```java
package com.alx.taskmgr.dto.task;

import com.alx.taskmgr.dto.category.CategoryResponse;
import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.entity.TaskStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for representing a task in API responses.
 * Contains task details including ID, title, description, due date, status,
 * associated category, and the owning user.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private LocalDateTime dueDate;
    private TaskStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private CategoryResponse category;
    private UserResponse owner;
}
```
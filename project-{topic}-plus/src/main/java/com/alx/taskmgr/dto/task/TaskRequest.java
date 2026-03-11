```java
package com.alx.taskmgr.dto.task;

import com.alx.taskmgr.entity.TaskStatus;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTO for creating or updating a task.
 * Contains task details such as title, description, due date, status, and category ID.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TaskRequest {
    @NotBlank(message = "Title cannot be empty")
    @Size(min = 3, max = 255, message = "Title must be between 3 and 255 characters")
    private String title;

    @Size(max = 1000, message = "Description cannot exceed 1000 characters")
    private String description;

    @NotNull(message = "Due date cannot be null")
    @FutureOrPresent(message = "Due date must be in the present or future")
    private LocalDateTime dueDate;

    @NotNull(message = "Task status cannot be null")
    private TaskStatus status;

    @NotNull(message = "Category ID cannot be null")
    private Long categoryId;
}
```
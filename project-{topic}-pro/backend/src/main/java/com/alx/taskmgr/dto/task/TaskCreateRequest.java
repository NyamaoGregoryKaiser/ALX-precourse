package com.alx.taskmgr.dto.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * DTO for creating a new task.
 */
@Data
public class TaskCreateRequest {
    @NotBlank(message = "Task title is required")
    @Size(min = 3, max = 200, message = "Task title must be between 3 and 200 characters")
    private String title;

    @Size(max = 1000, message = "Task description cannot exceed 1000 characters")
    private String description;

    @NotNull(message = "Project ID is required")
    private Long projectId;

    private Long assignedToId;
    private LocalDateTime dueDate;
}
package com.alx.taskmgr.dto.task;

import com.alx.taskmgr.entity.enums.TaskStatus;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * DTO for updating an existing task.
 */
@Data
public class TaskUpdateRequest {
    @Size(min = 3, max = 200, message = "Task title must be between 3 and 200 characters")
    private String title;

    @Size(max = 1000, message = "Task description cannot exceed 1000 characters")
    private String description;

    private TaskStatus status;
    private Long assignedToId;
    private LocalDateTime dueDate;
}
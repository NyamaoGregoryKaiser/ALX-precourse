package com.alx.taskmgr.dto.task;

import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.entity.enums.TaskStatus;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * DTO for returning task details.
 */
@Data
public class TaskResponse {
    private Long id;
    private String title;
    private String description;
    private TaskStatus status;
    private Long projectId; // Only project ID, or a nested ProjectResponse if more details needed
    private UserResponse assignedTo;
    private LocalDateTime dueDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
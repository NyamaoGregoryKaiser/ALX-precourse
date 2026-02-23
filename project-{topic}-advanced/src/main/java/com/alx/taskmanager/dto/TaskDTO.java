package com.alx.taskmanager.dto;

import com.alx.taskmanager.model.TaskPriority;
import com.alx.taskmanager.model.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TaskDTO {
    private Long id;
    @NotBlank
    @Size(min = 3, max = 200)
    private String title;
    @Size(max = 1000)
    private String description;
    private TaskStatus status;
    private TaskPriority priority;
    private LocalDateTime dueDate;
    @NotNull
    private Long projectId;
    private Long assigneeId;
    private Long reporterId;
    private String projectName; // For response
    private String assigneeUsername; // For response
    private String reporterUsername; // For response
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
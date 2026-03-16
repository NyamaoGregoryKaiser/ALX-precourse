package com.alx.taskmgr.dto.project;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * DTO for creating a new project.
 */
@Data
public class ProjectCreateRequest {
    @NotBlank(message = "Project name is required")
    @Size(min = 3, max = 100, message = "Project name must be between 3 and 100 characters")
    private String name;

    @Size(max = 500, message = "Project description cannot exceed 500 characters")
    private String description;
}
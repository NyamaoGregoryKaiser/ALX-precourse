package com.alx.taskmgr.dto.project;

import com.alx.taskmgr.dto.user.UserResponse;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.Set;

/**
 * DTO for returning project details.
 */
@Data
public class ProjectResponse {
    private Long id;
    private String name;
    private String description;
    private UserResponse owner;
    private Set<UserResponse> collaborators;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
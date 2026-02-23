package com.alx.taskmanager.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
public class ProjectDTO {
    private Long id;
    @NotBlank
    @Size(min = 3, max = 100)
    private String name;
    @Size(max = 500)
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Set<Long> assignedUserIds; // For assigning users to a project
    private Set<UserDTO> assignedUsers; // For response
}
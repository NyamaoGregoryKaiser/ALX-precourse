```java
package com.alx.pms.project.service;

import com.alx.pms.exception.ForbiddenException;
import com.alx.pms.exception.ResourceNotFoundException;
import com.alx.pms.model.Project;
import com.alx.pms.model.User;
import com.alx.pms.project.dto.ProjectRequest;
import com.alx.pms.project.dto.ProjectResponse;
import com.alx.pms.project.repository.ProjectRepository;
import com.alx.pms.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserService userService; // To get User entity for owner

    @Transactional
    public ProjectResponse createProject(ProjectRequest request, Long ownerId) {
        log.info("Creating new project for owner ID: {}", ownerId);
        User owner = userService.findUserEntityById(ownerId); // Ensure owner exists

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());
        project.setOwner(owner);

        Project savedProject = projectRepository.save(project);
        log.info("Project '{}' created with ID: {}", savedProject.getName(), savedProject.getId());
        return convertToDto(savedProject);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "projects", key = "#id") // Cache project by ID
    public ProjectResponse getProjectById(Long id, Long currentUserId) {
        log.debug("Fetching project by ID: {}", id);
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Project not found with ID: {}", id);
                    return new ResourceNotFoundException("Project not found with ID: " + id);
                });

        if (!Objects.equals(project.getOwner().getId(), currentUserId)) {
            log.warn("User {} attempted to access project {} not owned by them.", currentUserId, id);
            throw new ForbiddenException("You are not authorized to view this project.");
        }
        return convertToDto(project);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAllProjectsForUser(Long ownerId) {
        log.debug("Fetching all projects for owner ID: {}", ownerId);
        User owner = userService.findUserEntityById(ownerId);
        return projectRepository.findByOwner(owner).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    @CachePut(value = "projects", key = "#id") // Update cache after project update
    public ProjectResponse updateProject(Long id, ProjectRequest request, Long currentUserId) {
        log.info("Updating project with ID: {}", id);
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Project not found for update with ID: {}", id);
                    return new ResourceNotFoundException("Project not found with ID: " + id);
                });

        if (!Objects.equals(project.getOwner().getId(), currentUserId)) {
            log.warn("User {} attempted to update project {} not owned by them.", currentUserId, id);
            throw new ForbiddenException("You are not authorized to update this project.");
        }

        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setStartDate(request.getStartDate());
        project.setEndDate(request.getEndDate());

        Project updatedProject = projectRepository.save(project);
        log.info("Project with ID {} updated successfully.", id);
        return convertToDto(updatedProject);
    }

    @Transactional
    @CacheEvict(value = "projects", key = "#id") // Evict project from cache on deletion
    public void deleteProject(Long id, Long currentUserId) {
        log.info("Attempting to delete project with ID: {}", id);
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Project not found for deletion with ID: {}", id);
                    return new ResourceNotFoundException("Project not found with ID: " + id);
                });

        if (!Objects.equals(project.getOwner().getId(), currentUserId)) {
            log.warn("User {} attempted to delete project {} not owned by them.", currentUserId, id);
            throw new ForbiddenException("You are not authorized to delete this project.");
        }

        projectRepository.delete(project);
        log.info("Project with ID {} deleted successfully.", id);
    }

    public ProjectResponse convertToDto(Project project) {
        ProjectResponse dto = new ProjectResponse();
        dto.setId(project.getId());
        dto.setName(project.getName());
        dto.setDescription(project.getDescription());
        dto.setStartDate(project.getStartDate());
        dto.setEndDate(project.getEndDate());
        dto.setOwner(userService.convertToDto(project.getOwner())); // Convert owner to DTO
        dto.setCreatedAt(project.getCreatedAt());
        dto.setUpdatedAt(project.getUpdatedAt());
        return dto;
    }

    // Helper method to retrieve Project entity for other services without DTO conversion
    @Transactional(readOnly = true)
    public Project findProjectEntityById(Long projectId, Long currentUserId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with ID: " + projectId));

        if (!Objects.equals(project.getOwner().getId(), currentUserId)) {
            throw new ForbiddenException("You are not authorized to access tasks in this project.");
        }
        return project;
    }
}
```
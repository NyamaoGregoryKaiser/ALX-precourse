package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.project.ProjectCreateRequest;
import com.alx.taskmgr.dto.project.ProjectResponse;
import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.entity.Project;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.exception.UnauthorizedException;
import com.alx.taskmgr.repository.ProjectRepository;
import com.alx.taskmgr.repository.UserRepository;
import com.alx.taskmgr.util.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service for managing project operations.
 */
@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    /**
     * Creates a new project. The current authenticated user becomes the owner.
     * @param request ProjectCreateRequest DTO.
     * @return ProjectResponse DTO of the created project.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "projectsByUser", allEntries = true),
            @CacheEvict(value = "projectById", allEntries = true) // Specific project IDs might be affected
    })
    public ProjectResponse createProject(ProjectCreateRequest request) {
        Long currentUserId = UserContext.getCurrentUserId();
        User owner = userRepository.findById(currentUserId)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found."));

        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setOwner(owner);
        project.getCollaborators().add(owner); // Owner is also a collaborator by default

        Project savedProject = projectRepository.save(project);
        return mapToProjectResponse(savedProject);
    }

    /**
     * Retrieves a project by its ID.
     * @param id The ID of the project.
     * @return ProjectResponse DTO.
     * @throws ResourceNotFoundException if the project is not found.
     * @throws UnauthorizedException if the current user is not authorized to view the project.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "projectById", key = "#id")
    public ProjectResponse getProjectById(Long id) {
        Long currentUserId = UserContext.getCurrentUserId();
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));

        // Check if the current user is the owner or a collaborator
        if (!project.getOwner().getId().equals(currentUserId) &&
            project.getCollaborators().stream().noneMatch(c -> c.getId().equals(currentUserId))) {
            throw new UnauthorizedException("You are not authorized to view this project.");
        }

        return mapToProjectResponse(project);
    }

    /**
     * Retrieves all projects where the current user is either the owner or a collaborator.
     * @return List of ProjectResponse DTOs.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "projectsByUser", key = "#root.methodName + '-' + T(com.alx.taskmgr.util.UserContext).getCurrentUserId()")
    public List<ProjectResponse> getAllProjectsForCurrentUser() {
        Long currentUserId = UserContext.getCurrentUserId();
        return projectRepository.findByOwnerIdOrCollaborators_Id(currentUserId, currentUserId).stream()
                .map(this::mapToProjectResponse)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing project. Only the owner can update.
     * @param id The ID of the project to update.
     * @param request ProjectCreateRequest DTO containing updated details.
     * @return ProjectResponse DTO of the updated project.
     * @throws ResourceNotFoundException if the project is not found.
     * @throws UnauthorizedException if the current user is not the owner.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "projectsByUser", allEntries = true),
            @CacheEvict(value = "projectById", key = "#id")
    })
    public ProjectResponse updateProject(Long id, ProjectCreateRequest request) {
        Long currentUserId = UserContext.getCurrentUserId();
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));

        if (!project.getOwner().getId().equals(currentUserId)) {
            throw new UnauthorizedException("You are not authorized to update this project.");
        }

        project.setName(request.getName());
        project.setDescription(request.getDescription());

        Project updatedProject = projectRepository.save(project);
        return mapToProjectResponse(updatedProject);
    }

    /**
     * Adds a collaborator to a project. Only the owner can add collaborators.
     * @param projectId The ID of the project.
     * @param userId The ID of the user to add as a collaborator.
     * @return ProjectResponse DTO of the updated project.
     * @throws ResourceNotFoundException if project or user not found.
     * @throws UnauthorizedException if the current user is not the owner.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "projectsByUser", allEntries = true),
            @CacheEvict(value = "projectById", key = "#projectId")
    })
    public ProjectResponse addCollaborator(Long projectId, Long userId) {
        Long currentUserId = UserContext.getCurrentUserId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        if (!project.getOwner().getId().equals(currentUserId)) {
            throw new UnauthorizedException("You are not authorized to add collaborators to this project.");
        }

        User collaborator = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaborator user not found with id: " + userId));

        project.getCollaborators().add(collaborator);
        Project updatedProject = projectRepository.save(project);
        return mapToProjectResponse(updatedProject);
    }

    /**
     * Removes a collaborator from a project. Only the owner can remove collaborators.
     * @param projectId The ID of the project.
     * @param userId The ID of the user to remove as a collaborator.
     * @return ProjectResponse DTO of the updated project.
     * @throws ResourceNotFoundException if project or user not found.
     * @throws UnauthorizedException if the current user is not the owner.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "projectsByUser", allEntries = true),
            @CacheEvict(value = "projectById", key = "#projectId")
    })
    public ProjectResponse removeCollaborator(Long projectId, Long userId) {
        Long currentUserId = UserContext.getCurrentUserId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        if (!project.getOwner().getId().equals(currentUserId)) {
            throw new UnauthorizedException("You are not authorized to remove collaborators from this project.");
        }

        User collaborator = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Collaborator user not found with id: " + userId));

        // Prevent owner from removing themselves directly via collaborator removal, they must transfer ownership or delete project
        if (project.getOwner().getId().equals(userId)) {
            throw new IllegalArgumentException("Project owner cannot be removed as a collaborator directly. Transfer ownership first.");
        }

        project.getCollaborators().remove(collaborator);
        Project updatedProject = projectRepository.save(project);
        return mapToProjectResponse(updatedProject);
    }

    /**
     * Deletes a project. Only the owner can delete the project.
     * @param id The ID of the project to delete.
     * @throws ResourceNotFoundException if the project is not found.
     * @throws UnauthorizedException if the current user is not the owner.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "projectsByUser", allEntries = true),
            @CacheEvict(value = "projectById", key = "#id")
    })
    public void deleteProject(Long id) {
        Long currentUserId = UserContext.getCurrentUserId();
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));

        if (!project.getOwner().getId().equals(currentUserId)) {
            throw new UnauthorizedException("You are not authorized to delete this project.");
        }

        projectRepository.delete(project);
    }

    /**
     * Maps a Project entity to a ProjectResponse DTO.
     * @param project The Project entity.
     * @return ProjectResponse DTO.
     */
    private ProjectResponse mapToProjectResponse(Project project) {
        ProjectResponse response = new ProjectResponse();
        response.setId(project.getId());
        response.setName(project.getName());
        response.setDescription(project.getDescription());
        response.setCreatedAt(project.getCreatedAt());
        response.setUpdatedAt(project.getUpdatedAt());

        UserResponse ownerResponse = new UserResponse();
        ownerResponse.setId(project.getOwner().getId());
        ownerResponse.setUsername(project.getOwner().getUsername());
        ownerResponse.setEmail(project.getOwner().getEmail());
        response.setOwner(ownerResponse);

        Set<UserResponse> collaboratorResponses = project.getCollaborators().stream()
                .map(user -> {
                    UserResponse ur = new UserResponse();
                    ur.setId(user.getId());
                    ur.setUsername(user.getUsername());
                    ur.setEmail(user.getEmail());
                    return ur;
                })
                .collect(Collectors.toSet());
        response.setCollaborators(collaboratorResponses);

        return response;
    }
}
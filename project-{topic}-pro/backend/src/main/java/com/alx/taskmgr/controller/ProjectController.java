package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.project.ProjectCreateRequest;
import com.alx.taskmgr.dto.project.ProjectResponse;
import com.alx.taskmgr.service.ProjectService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing project operations.
 */
@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {

    private final ProjectService projectService;

    /**
     * Creates a new project.
     * @param request ProjectCreateRequest DTO.
     * @return ResponseEntity with the created project's details.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ProjectResponse> createProject(@Valid @RequestBody ProjectCreateRequest request) {
        ProjectResponse newProject = projectService.createProject(request);
        return new ResponseEntity<>(newProject, HttpStatus.CREATED);
    }

    /**
     * Retrieves a project by its ID.
     * @param id The ID of the project.
     * @return ResponseEntity with ProjectResponse DTO.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<ProjectResponse> getProjectById(@PathVariable Long id) {
        ProjectResponse project = projectService.getProjectById(id);
        return ResponseEntity.ok(project);
    }

    /**
     * Retrieves all projects visible to the current authenticated user (owner or collaborator).
     * @return ResponseEntity with a list of ProjectResponse DTOs.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<ProjectResponse>> getAllProjectsForCurrentUser() {
        List<ProjectResponse> projects = projectService.getAllProjectsForCurrentUser();
        return ResponseEntity.ok(projects);
    }

    /**
     * Updates an existing project.
     * @param id The ID of the project to update.
     * @param request ProjectCreateRequest DTO containing updated details.
     * @return ResponseEntity with the updated project's details.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')") // Logic in service layer enforces owner-only update
    public ResponseEntity<ProjectResponse> updateProject(@PathVariable Long id, @Valid @RequestBody ProjectCreateRequest request) {
        ProjectResponse updatedProject = projectService.updateProject(id, request);
        return ResponseEntity.ok(updatedProject);
    }

    /**
     * Adds a collaborator to a project.
     * @param projectId The ID of the project.
     * @param userId The ID of the user to add as a collaborator.
     * @return ResponseEntity with the updated project's details.
     */
    @PostMapping("/{projectId}/collaborators/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')") // Logic in service layer enforces owner-only add
    public ResponseEntity<ProjectResponse> addCollaborator(@PathVariable Long projectId, @PathVariable Long userId) {
        ProjectResponse updatedProject = projectService.addCollaborator(projectId, userId);
        return ResponseEntity.ok(updatedProject);
    }

    /**
     * Removes a collaborator from a project.
     * @param projectId The ID of the project.
     * @param userId The ID of the user to remove as a collaborator.
     * @return ResponseEntity with the updated project's details.
     */
    @DeleteMapping("/{projectId}/collaborators/{userId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')") // Logic in service layer enforces owner-only remove
    public ResponseEntity<ProjectResponse> removeCollaborator(@PathVariable Long projectId, @PathVariable Long userId) {
        ProjectResponse updatedProject = projectService.removeCollaborator(projectId, userId);
        return ResponseEntity.ok(updatedProject);
    }


    /**
     * Deletes a project.
     * @param id The ID of the project to delete.
     * @return ResponseEntity indicating success.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')") // Logic in service layer enforces owner-only delete
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }
}
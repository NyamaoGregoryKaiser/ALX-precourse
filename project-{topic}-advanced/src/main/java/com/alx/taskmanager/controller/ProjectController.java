package com.alx.taskmanager.controller;

import com.alx.taskmanager.dto.ProjectDTO;
import com.alx.taskmanager.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Project Management", description = "Operations related to project management")
public class ProjectController {

    private final ProjectService projectService;

    @Operation(summary = "Create a new project")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('USER')")
    public ResponseEntity<ProjectDTO> createProject(@Valid @RequestBody ProjectDTO projectDTO) {
        ProjectDTO createdProject = projectService.createProject(projectDTO);
        return new ResponseEntity<>(createdProject, HttpStatus.CREATED);
    }

    @Operation(summary = "Get all projects")
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('USER')")
    public ResponseEntity<List<ProjectDTO>> getAllProjects() {
        List<ProjectDTO> projects = projectService.getAllProjects();
        return ResponseEntity.ok(projects);
    }

    @Operation(summary = "Get project by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @projectSecurity.canAccessProject(#id)")
    public ResponseEntity<ProjectDTO> getProjectById(@PathVariable Long id) {
        ProjectDTO project = projectService.getProjectById(id);
        return ResponseEntity.ok(project);
    }

    @Operation(summary = "Update an existing project")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @projectSecurity.canModifyProject(#id)")
    public ResponseEntity<ProjectDTO> updateProject(@PathVariable Long id, @Valid @RequestBody ProjectDTO projectDTO) {
        ProjectDTO updatedProject = projectService.updateProject(id, projectDTO);
        return ResponseEntity.ok(updatedProject);
    }

    @Operation(summary = "Delete a project (Admin or project creator only)")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @projectSecurity.canDeleteProject(#id)")
    public ResponseEntity<Void> deleteProject(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Assign users to a project")
    @PostMapping("/{projectId}/assign-users")
    @PreAuthorize("hasRole('ADMIN') or @projectSecurity.canModifyProject(#projectId)")
    public ResponseEntity<ProjectDTO> assignUsersToProject(@PathVariable Long projectId, @RequestBody Set<Long> userIds) {
        ProjectDTO updatedProject = projectService.assignUsersToProject(projectId, userIds);
        return ResponseEntity.ok(updatedProject);
    }

    @Operation(summary = "Remove users from a project")
    @DeleteMapping("/{projectId}/remove-users")
    @PreAuthorize("hasRole('ADMIN') or @projectSecurity.canModifyProject(#projectId)")
    public ResponseEntity<ProjectDTO> removeUsersFromProject(@PathVariable Long projectId, @RequestBody Set<Long> userIds) {
        ProjectDTO updatedProject = projectService.removeUsersFromProject(projectId, userIds);
        return ResponseEntity.ok(updatedProject);
    }
}
```java
package com.alx.pms.project.controller;

import com.alx.pms.model.User;
import com.alx.pms.project.dto.ProjectRequest;
import com.alx.pms.project.dto.ProjectResponse;
import com.alx.pms.project.service.ProjectService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Projects", description = "Project management APIs")
@Slf4j
public class ProjectController {

    private final ProjectService projectService;

    @Operation(summary = "Create a new project")
    @PostMapping
    public ResponseEntity<ProjectResponse> createProject(@AuthenticationPrincipal User currentUser,
                                                         @Valid @RequestBody ProjectRequest request) {
        log.info("User {} creating new project: {}", currentUser.getUsername(), request.getName());
        ProjectResponse response = projectService.createProject(request, currentUser.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @Operation(summary = "Get a project by ID (owner only)")
    @GetMapping("/{id}")
    public ResponseEntity<ProjectResponse> getProjectById(@PathVariable Long id,
                                                          @AuthenticationPrincipal User currentUser) {
        log.debug("User {} fetching project with ID: {}", currentUser.getUsername(), id);
        return ResponseEntity.ok(projectService.getProjectById(id, currentUser.getId()));
    }

    @Operation(summary = "Get all projects for the current user")
    @GetMapping
    public ResponseEntity<List<ProjectResponse>> getAllProjectsForCurrentUser(@AuthenticationPrincipal User currentUser) {
        log.debug("User {} fetching all their projects.", currentUser.getUsername());
        return ResponseEntity.ok(projectService.getAllProjectsForUser(currentUser.getId()));
    }

    @Operation(summary = "Update a project by ID (owner only)")
    @PutMapping("/{id}")
    public ResponseEntity<ProjectResponse> updateProject(@PathVariable Long id,
                                                         @AuthenticationPrincipal User currentUser,
                                                         @Valid @RequestBody ProjectRequest request) {
        log.info("User {} updating project with ID: {}", currentUser.getUsername(), id);
        return ResponseEntity.ok(projectService.updateProject(id, request, currentUser.getId()));
    }

    @Operation(summary = "Delete a project by ID (owner only)")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteProject(@PathVariable Long id,
                              @AuthenticationPrincipal User currentUser) {
        log.info("User {} deleting project with ID: {}", currentUser.getUsername(), id);
        projectService.deleteProject(id, currentUser.getId());
    }
}
```
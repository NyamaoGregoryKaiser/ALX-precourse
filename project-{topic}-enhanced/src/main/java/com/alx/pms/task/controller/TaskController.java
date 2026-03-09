```java
package com.alx.pms.task.controller;

import com.alx.pms.model.User;
import com.alx.pms.task.dto.TaskRequest;
import com.alx.pms.task.dto.TaskResponse;
import com.alx.pms.task.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/projects/{projectId}/tasks")
@RequiredArgsConstructor
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "Tasks", description = "Task management APIs within projects")
@Slf4j
public class TaskController {

    private final TaskService taskService;

    @Operation(summary = "Create a new task for a project (project owner only)")
    @PostMapping
    public ResponseEntity<TaskResponse> createTask(@PathVariable Long projectId,
                                                   @AuthenticationPrincipal User currentUser,
                                                   @Valid @RequestBody TaskRequest request) {
        log.info("User {} creating task for project ID: {}", currentUser.getUsername(), projectId);
        TaskResponse response = taskService.createTask(projectId, request, currentUser.getId());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @Operation(summary = "Get a task by ID within a project (project owner only)")
    @GetMapping("/{taskId}")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long projectId,
                                                    @PathVariable Long taskId,
                                                    @AuthenticationPrincipal User currentUser) {
        log.debug("User {} fetching task {} for project {}.", currentUser.getUsername(), taskId, projectId);
        // The service layer handles verification that the project exists and belongs to the user
        return ResponseEntity.ok(taskService.getTaskById(taskId, currentUser.getId()));
    }

    @Operation(summary = "Get all tasks for a specific project (project owner only)")
    @GetMapping
    public ResponseEntity<List<TaskResponse>> getTasksByProjectId(@PathVariable Long projectId,
                                                                  @AuthenticationPrincipal User currentUser) {
        log.debug("User {} fetching all tasks for project ID: {}", currentUser.getUsername(), projectId);
        return ResponseEntity.ok(taskService.getTasksByProjectId(projectId, currentUser.getId()));
    }

    @Operation(summary = "Get tasks assigned to the current user")
    @GetMapping("/assigned-to-me")
    public ResponseEntity<List<TaskResponse>> getTasksAssignedToCurrentUser(@AuthenticationPrincipal User currentUser) {
        log.debug("User {} fetching tasks assigned to themselves.", currentUser.getUsername());
        return ResponseEntity.ok(taskService.getTasksAssignedToUser(currentUser.getId(), currentUser.getId()));
    }


    @Operation(summary = "Update a task by ID within a project (project owner only)")
    @PutMapping("/{taskId}")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long projectId,
                                                   @PathVariable Long taskId,
                                                   @AuthenticationPrincipal User currentUser,
                                                   @Valid @RequestBody TaskRequest request) {
        log.info("User {} updating task {} for project {}.", currentUser.getUsername(), taskId, projectId);
        // The service layer handles verification that the project exists and belongs to the user
        return ResponseEntity.ok(taskService.updateTask(taskId, request, currentUser.getId()));
    }

    @Operation(summary = "Delete a task by ID within a project (project owner only)")
    @DeleteMapping("/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable Long projectId,
                           @PathVariable Long taskId,
                           @AuthenticationPrincipal User currentUser) {
        log.info("User {} deleting task {} for project {}.", currentUser.getUsername(), taskId, projectId);
        // The service layer handles verification that the project exists and belongs to the user
        taskService.deleteTask(taskId, currentUser.getId());
    }
}
```
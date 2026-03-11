```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.task.TaskRequest;
import com.alx.taskmgr.dto.task.TaskResponse;
import com.alx.taskmgr.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing tasks.
 * Provides CRUD operations for tasks, with authorization checks.
 */
@RestController
@RequestMapping("/api/v1/tasks")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth") // Indicates that this endpoint requires authentication
@Tag(name = "Tasks", description = "Operations related to user tasks")
public class TaskController {

    private final TaskService taskService;

    /**
     * Creates a new task for the authenticated user.
     *
     * @param request        The TaskRequest containing task details.
     * @param authentication The Spring Security Authentication object, providing current user details.
     * @return ResponseEntity with the created TaskResponse.
     */
    @Operation(summary = "Create a new task",
               responses = {
                   @ApiResponse(responseCode = "201", description = "Task created successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = TaskResponse.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input or category not found"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized")
               })
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskRequest request, Authentication authentication) {
        String userEmail = authentication.getName();
        TaskResponse response = taskService.createTask(request, userEmail);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Retrieves all tasks for the authenticated user.
     * ADMINs can retrieve all tasks in the system if 'ownerId' is not specified or for a specific user.
     *
     * @param authentication The Spring Security Authentication object.
     * @param ownerId        Optional. If provided by an ADMIN, retrieves tasks for that specific user.
     * @return ResponseEntity with a list of TaskResponse.
     */
    @Operation(summary = "Get all tasks for the authenticated user, or for a specific user (Admin only)",
               parameters = @Parameter(name = "ownerId", description = "Optional User ID to filter tasks by (Admin only). If not provided, returns tasks for the authenticated user."),
               responses = {
                   @ApiResponse(responseCode = "200", description = "Successfully retrieved tasks",
                                content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = TaskResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: Cannot access other users' tasks without ADMIN role")
               })
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<TaskResponse>> getAllTasks(
            Authentication authentication,
            @RequestParam(required = false) Long ownerId) {
        List<TaskResponse> tasks;
        if (ownerId != null && authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            // Admin can view tasks of any user
            tasks = taskService.getAllTasksByOwnerId(ownerId);
        } else if (ownerId != null && !authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            // Non-admin trying to specify ownerId is forbidden
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        } else {
            // Regular user gets their own tasks
            String userEmail = authentication.getName();
            tasks = taskService.getAllTasksForUser(userEmail);
        }
        return ResponseEntity.ok(tasks);
    }

    /**
     * Retrieves a task by its ID.
     * Only the owner of the task or an ADMIN can access it.
     *
     * @param id             The ID of the task to retrieve.
     * @param authentication The Spring Security Authentication object.
     * @return ResponseEntity with the TaskResponse.
     */
    @Operation(summary = "Get task by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Task found",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = TaskResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: User does not own this task"),
                   @ApiResponse(responseCode = "404", description = "Task not found")
               })
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long id, Authentication authentication) {
        String userEmail = authentication.getName();
        TaskResponse response = taskService.getTaskById(id, userEmail, authentication.getAuthorities());
        return ResponseEntity.ok(response);
    }

    /**
     * Updates an existing task.
     * Only the owner of the task or an ADMIN can update it.
     *
     * @param id             The ID of the task to update.
     * @param request        The TaskRequest containing updated task data.
     * @param authentication The Spring Security Authentication object.
     * @return ResponseEntity with the updated TaskResponse.
     */
    @Operation(summary = "Update an existing task",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Task updated successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = TaskResponse.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input or category not found"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: User does not own this task"),
                   @ApiResponse(responseCode = "404", description = "Task not found")
               })
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id, @Valid @RequestBody TaskRequest request, Authentication authentication) {
        String userEmail = authentication.getName();
        TaskResponse response = taskService.updateTask(id, request, userEmail, authentication.getAuthorities());
        return ResponseEntity.ok(response);
    }

    /**
     * Deletes a task by its ID.
     * Only the owner of the task or an ADMIN can delete it.
     *
     * @param id             The ID of the task to delete.
     * @param authentication The Spring Security Authentication object.
     * @return ResponseEntity with no content upon successful deletion.
     */
    @Operation(summary = "Delete a task",
               responses = {
                   @ApiResponse(responseCode = "204", description = "Task deleted successfully"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: User does not own this task"),
                   @ApiResponse(responseCode = "404", description = "Task not found")
               })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id, Authentication authentication) {
        String userEmail = authentication.getName();
        taskService.deleteTask(id, userEmail, authentication.getAuthorities());
        return ResponseEntity.noContent().build();
    }
}
```
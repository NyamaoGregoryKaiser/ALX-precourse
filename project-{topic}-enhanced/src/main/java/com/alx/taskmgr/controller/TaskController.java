```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.TaskDTO;
import com.alx.taskmgr.security.UserInfo;
import com.alx.taskmgr.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "Task Management", description = "CRUD APIs for user tasks")
public class TaskController {

    private final TaskService taskService;

    private Long getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserInfo userDetails = (UserInfo) authentication.getPrincipal();
        return userDetails.getId();
    }

    @Operation(summary = "Get all tasks for the current user, with optional filters")
    @GetMapping
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<List<TaskDTO>> getAllTasks(
            @RequestParam(required = false) Boolean completed,
            @RequestParam(required = false) Boolean overdue,
            @RequestParam(required = false) Long categoryId
    ) {
        Long userId = getCurrentUserId();
        if (completed != null) {
            return ResponseEntity.ok(taskService.getTasksByCompletionStatus(userId, completed));
        }
        if (overdue != null && overdue) {
            return ResponseEntity.ok(taskService.getOverdueTasks(userId));
        }
        if (categoryId != null) {
            return ResponseEntity.ok(taskService.getTasksByCategory(userId, categoryId));
        }
        return ResponseEntity.ok(taskService.getAllTasks(userId));
    }

    @Operation(summary = "Get a task by ID for the current user")
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<TaskDTO> getTaskById(@PathVariable Long id) {
        return ResponseEntity.ok(taskService.getTaskById(id, getCurrentUserId()));
    }

    @Operation(summary = "Create a new task for the current user")
    @PostMapping
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<TaskDTO> createTask(@Valid @RequestBody TaskDTO taskDTO) {
        return new ResponseEntity<>(taskService.createTask(taskDTO, getCurrentUserId()), HttpStatus.CREATED);
    }

    @Operation(summary = "Update an existing task for the current user")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<TaskDTO> updateTask(@PathVariable Long id, @Valid @RequestBody TaskDTO taskDTO) {
        return ResponseEntity.ok(taskService.updateTask(id, taskDTO, getCurrentUserId()));
    }

    @Operation(summary = "Delete a task for the current user")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id, getCurrentUserId());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Mark a task as complete or incomplete for the current user")
    @PutMapping("/{id}/complete")
    @PreAuthorize("hasRole('ROLE_USER')")
    public ResponseEntity<TaskDTO> markTaskComplete(@PathVariable Long id, @RequestParam boolean completed) {
        return ResponseEntity.ok(taskService.markTaskComplete(id, getCurrentUserId(), completed));
    }
}
```
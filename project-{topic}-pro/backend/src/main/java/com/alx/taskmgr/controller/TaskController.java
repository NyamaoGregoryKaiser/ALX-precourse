package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.task.TaskCreateRequest;
import com.alx.taskmgr.dto.task.TaskResponse;
import com.alx.taskmgr.dto.task.TaskUpdateRequest;
import com.alx.taskmgr.service.TaskService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for managing task operations.
 */
@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    /**
     * Creates a new task.
     * @param request TaskCreateRequest DTO.
     * @return ResponseEntity with the created task's details.
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TaskResponse> createTask(@Valid @RequestBody TaskCreateRequest request) {
        TaskResponse newTask = taskService.createTask(request);
        return new ResponseEntity<>(newTask, HttpStatus.CREATED);
    }

    /**
     * Retrieves a task by its ID.
     * @param id The ID of the task.
     * @return ResponseEntity with TaskResponse DTO.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TaskResponse> getTaskById(@PathVariable Long id) {
        TaskResponse task = taskService.getTaskById(id);
        return ResponseEntity.ok(task);
    }

    /**
     * Retrieves all tasks for a specific project.
     * @param projectId The ID of the project.
     * @return ResponseEntity with a list of TaskResponse DTOs.
     */
    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<TaskResponse>> getTasksByProjectId(@PathVariable Long projectId) {
        List<TaskResponse> tasks = taskService.getTasksByProjectId(projectId);
        return ResponseEntity.ok(tasks);
    }

    /**
     * Retrieves all tasks assigned to the current authenticated user.
     * @return ResponseEntity with a list of TaskResponse DTOs.
     */
    @GetMapping("/assigned-to-me")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<TaskResponse>> getTasksAssignedToCurrentUser() {
        List<TaskResponse> tasks = taskService.getTasksAssignedToCurrentUser();
        return ResponseEntity.ok(tasks);
    }

    /**
     * Updates an existing task.
     * @param id The ID of the task to update.
     * @param request TaskUpdateRequest DTO containing updated details.
     * @return ResponseEntity with the updated task's details.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<TaskResponse> updateTask(@PathVariable Long id, @Valid @RequestBody TaskUpdateRequest request) {
        TaskResponse updatedTask = taskService.updateTask(id, request);
        return ResponseEntity.ok(updatedTask);
    }

    /**
     * Deletes a task.
     * @param id The ID of the task to delete.
     * @return ResponseEntity indicating success.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteTask(@PathVariable Long id) {
        taskService.deleteTask(id);
        return ResponseEntity.noContent().build();
    }
}
```java
package com.alx.webscraper.controller;

import com.alx.webscraper.auth.model.User;
import com.alx.webscraper.model.dto.ScrapedDataDTO;
import com.alx.webscraper.model.dto.ScrapingTaskCreateDTO;
import com.alx.webscraper.model.dto.ScrapingTaskResponseDTO;
import com.alx.webscraper.model.dto.ScrapingTaskUpdateDTO;
import com.alx.webscraper.service.ScrapingTaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller for managing scraping tasks.
 * Provides CRUD operations and task execution triggers.
 * All endpoints require authentication and are tied to the authenticated user.
 */
@RestController
@RequestMapping("/api/v1/tasks")
@Tag(name = "Scraping Tasks", description = "API for managing web scraping tasks")
@SecurityRequirement(name = "bearerAuth") // Indicates that this controller requires JWT authentication
public class ScrapingTaskController {

    private final ScrapingTaskService scrapingTaskService;

    public ScrapingTaskController(ScrapingTaskService scrapingTaskService) {
        this.scrapingTaskService = scrapingTaskService;
    }

    /**
     * Creates a new scraping task.
     *
     * @param createDTO The request body containing task details.
     * @param user      The authenticated user.
     * @return A ResponseEntity with the created task and HTTP 201 status.
     */
    @PostMapping
    @Operation(summary = "Create a new scraping task",
               responses = {
                   @ApiResponse(responseCode = "201", description = "Task created successfully",
                                content = @Content(schema = @Schema(implementation = ScrapingTaskResponseDTO.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden")
               })
    public ResponseEntity<ScrapingTaskResponseDTO> createTask(
            @Valid @RequestBody ScrapingTaskCreateDTO createDTO,
            @Parameter(hidden = true) @AuthenticationPrincipal User user) {
        ScrapingTaskResponseDTO newTask = scrapingTaskService.createTask(createDTO, user);
        return new ResponseEntity<>(newTask, HttpStatus.CREATED);
    }

    /**
     * Retrieves a specific scraping task by its ID.
     *
     * @param id   The ID of the task to retrieve.
     * @param user The authenticated user.
     * @return A ResponseEntity with the task details and HTTP 200 status.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get a scraping task by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Task found",
                                content = @Content(schema = @Schema(implementation = ScrapingTaskResponseDTO.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden"),
                   @ApiResponse(responseCode = "404", description = "Task not found")
               })
    public ResponseEntity<ScrapingTaskResponseDTO> getTaskById(
            @PathVariable UUID id,
            @Parameter(hidden = true) @AuthenticationPrincipal User user) {
        ScrapingTaskResponseDTO task = scrapingTaskService.getTaskById(id, user);
        return ResponseEntity.ok(task);
    }

    /**
     * Retrieves all scraping tasks owned by the authenticated user.
     *
     * @param user The authenticated user.
     * @return A ResponseEntity with a list of tasks and HTTP 200 status.
     */
    @GetMapping
    @Operation(summary = "Get all scraping tasks for the authenticated user",
               responses = {
                   @ApiResponse(responseCode = "200", description = "List of tasks retrieved",
                                content = @Content(schema = @Schema(implementation = List.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized")
               })
    public ResponseEntity<List<ScrapingTaskResponseDTO>> getAllTasks(
            @Parameter(hidden = true) @AuthenticationPrincipal User user) {
        List<ScrapingTaskResponseDTO> tasks = scrapingTaskService.getAllTasksForUser(user);
        return ResponseEntity.ok(tasks);
    }

    /**
     * Updates an existing scraping task.
     *
     * @param id        The ID of the task to update.
     * @param updateDTO The request body containing update details.
     * @param user      The authenticated user.
     * @return A ResponseEntity with the updated task and HTTP 200 status.
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update an existing scraping task",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Task updated successfully",
                                content = @Content(schema = @Schema(implementation = ScrapingTaskResponseDTO.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden"),
                   @ApiResponse(responseCode = "404", description = "Task not found")
               })
    public ResponseEntity<ScrapingTaskResponseDTO> updateTask(
            @PathVariable UUID id,
            @Valid @RequestBody ScrapingTaskUpdateDTO updateDTO,
            @Parameter(hidden = true) @AuthenticationPrincipal User user) {
        ScrapingTaskResponseDTO updatedTask = scrapingTaskService.updateTask(id, updateDTO, user);
        return ResponseEntity.ok(updatedTask);
    }

    /**
     * Deletes a scraping task by its ID.
     *
     * @param id   The ID of the task to delete.
     * @param user The authenticated user.
     * @return A ResponseEntity with no content and HTTP 204 status.
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a scraping task",
               responses = {
                   @ApiResponse(responseCode = "204", description = "Task deleted successfully"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden"),
                   @ApiResponse(responseCode = "404", description = "Task not found")
               })
    public ResponseEntity<Void> deleteTask(
            @PathVariable UUID id,
            @Parameter(hidden = true) @AuthenticationPrincipal User user) {
        scrapingTaskService.deleteTask(id, user);
        return ResponseEntity.noContent().build();
    }

    /**
     * Triggers an immediate execution of a scraping task.
     *
     * @param id   The ID of the task to trigger.
     * @param user The authenticated user.
     * @return A ResponseEntity with the updated task status and HTTP 200 status.
     * @throws IOException If an I/O error occurs during scraping.
     */
    @PostMapping("/{id}/trigger")
    @Operation(summary = "Manually trigger a scraping task execution",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Task execution triggered",
                                content = @Content(schema = @Schema(implementation = ScrapingTaskResponseDTO.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized"),
                   @ApiResponse(responseCode = "403", description = "Forbidden"),
                   @ApiResponse(responseCode = "404", description = "Task not found"),
                   @ApiResponse(responseCode = "500", description = "Internal server error during scraping")
               })
    public ResponseEntity<ScrapingTaskResponseDTO> triggerTaskExecution(
            @PathVariable UUID id,
            @Parameter(hidden = true) @AuthenticationPrincipal User user) throws IOException {
        ScrapingTaskResponseDTO updatedTask = scrapingTaskService.triggerTaskExecution(id, user);
        return ResponseEntity.ok(updatedTask);
    }
}
```
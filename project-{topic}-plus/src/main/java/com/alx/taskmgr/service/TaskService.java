```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.task.TaskRequest;
import com.alx.taskmgr.dto.task.TaskResponse;
import com.alx.taskmgr.dto.category.CategoryResponse;
import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.entity.Category;
import com.alx.taskmgr.entity.Task;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.exception.BadRequestException;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.exception.UnauthorizedException;
import com.alx.taskmgr.repository.CategoryRepository;
import com.alx.taskmgr.repository.TaskRepository;
import com.alx.taskmgr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service class for managing tasks.
 * Provides business logic for CRUD operations on tasks, with authorization checks and caching.
 */
@Service
@RequiredArgsConstructor
@Slf4j // For logging
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    /**
     * Creates a new task for the specified user.
     *
     * @param request The TaskRequest containing task details.
     * @param userEmail The email of the authenticated user creating the task.
     * @return The created TaskResponse.
     * @throws ResourceNotFoundException If the category or user specified is not found.
     * @throws BadRequestException If the due date is in the past.
     */
    @Transactional
    @CacheEvict(value = "tasksCache", allEntries = true) // Clear relevant caches on new task creation
    public TaskResponse createTask(TaskRequest request, String userEmail) {
        User owner = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));

        // Basic business logic: ensure due date is in the future/present
        if (request.getDueDate().isBefore(LocalDateTime.now().minusSeconds(5))) { // Allow a small buffer
            throw new BadRequestException("Due date cannot be in the past.");
        }

        Task task = Task.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .dueDate(request.getDueDate())
                .status(request.getStatus())
                .owner(owner)
                .category(category)
                .build();

        Task savedTask = taskRepository.save(task);
        log.info("Task created: {}", savedTask.getId());
        return mapToResponse(savedTask);
    }

    /**
     * Retrieves all tasks for a specific user.
     *
     * @param userEmail The email of the user whose tasks are to be retrieved.
     * @return A list of TaskResponse for the user.
     * @throws ResourceNotFoundException If the user is not found.
     */
    @Cacheable(value = "tasksCache", key = "#userEmail") // Cache tasks per user
    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasksForUser(String userEmail) {
        User owner = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

        return taskRepository.findByOwnerId(owner.getId()).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves all tasks in the system by owner ID (Admin only).
     *
     * @param ownerId The ID of the owner to filter tasks by.
     * @return A list of TaskResponse for the specified owner.
     * @throws ResourceNotFoundException If the owner is not found.
     */
    @Transactional(readOnly = true)
    public List<TaskResponse> getAllTasksByOwnerId(Long ownerId) {
        if (!userRepository.existsById(ownerId)) {
            throw new ResourceNotFoundException("User not found with ID: " + ownerId);
        }
        return taskRepository.findByOwnerId(ownerId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }


    /**
     * Retrieves a single task by its ID, with authorization check.
     * Only the task owner or an ADMIN can view the task.
     *
     * @param taskId The ID of the task to retrieve.
     * @param userEmail The email of the authenticated user.
     * @param authorities The authorities (roles) of the authenticated user.
     * @return The TaskResponse for the found task.
     * @throws ResourceNotFoundException If the task is not found.
     * @throws UnauthorizedException If the user is not authorized to view the task.
     */
    @Cacheable(value = "tasksCache", key = "#taskId") // Cache single task by ID
    @Transactional(readOnly = true)
    public TaskResponse getTaskById(Long taskId, String userEmail, Collection<? extends GrantedAuthority> authorities) {
        User requestingUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

        // Check if the requesting user is the owner or an ADMIN
        boolean isAdmin = authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!task.getOwner().getId().equals(requestingUser.getId()) && !isAdmin) {
            throw new UnauthorizedException("You are not authorized to view this task.");
        }
        return mapToResponse(task);
    }

    /**
     * Updates an existing task.
     * Only the task owner or an ADMIN can update the task.
     *
     * @param taskId The ID of the task to update.
     * @param request The TaskRequest containing updated task details.
     * @param userEmail The email of the authenticated user performing the update.
     * @param authorities The authorities (roles) of the authenticated user.
     * @return The updated TaskResponse.
     * @throws ResourceNotFoundException If the task or category is not found.
     * @throws UnauthorizedException If the user is not authorized to update the task.
     * @throws BadRequestException If the due date is in the past.
     */
    @Transactional
    @CacheEvict(value = {"tasksCache", "tasksCache::#taskId"}, allEntries = true) // Clear specific and general caches
    public TaskResponse updateTask(Long taskId, TaskRequest request, String userEmail, Collection<? extends GrantedAuthority> authorities) {
        User requestingUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

        // Authorization check
        boolean isAdmin = authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!task.getOwner().getId().equals(requestingUser.getId()) && !isAdmin) {
            throw new UnauthorizedException("You are not authorized to update this task.");
        }

        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + request.getCategoryId()));

        if (request.getDueDate().isBefore(LocalDateTime.now().minusSeconds(5))) {
            throw new BadRequestException("Due date cannot be in the past.");
        }

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDueDate(request.getDueDate());
        task.setStatus(request.getStatus());
        task.setCategory(category); // Update category

        Task updatedTask = taskRepository.save(task);
        log.info("Task updated: {}", updatedTask.getId());
        return mapToResponse(updatedTask);
    }

    /**
     * Deletes a task by its ID.
     * Only the task owner or an ADMIN can delete the task.
     *
     * @param taskId The ID of the task to delete.
     * @param userEmail The email of the authenticated user performing the deletion.
     * @param authorities The authorities (roles) of the authenticated user.
     * @throws ResourceNotFoundException If the task is not found.
     * @throws UnauthorizedException If the user is not authorized to delete the task.
     */
    @Transactional
    @CacheEvict(value = {"tasksCache", "tasksCache::#taskId"}, allEntries = true) // Clear specific and general caches
    public void deleteTask(Long taskId, String userEmail, Collection<? extends GrantedAuthority> authorities) {
        User requestingUser = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + userEmail));

        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with ID: " + taskId));

        // Authorization check
        boolean isAdmin = authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        if (!task.getOwner().getId().equals(requestingUser.getId()) && !isAdmin) {
            throw new UnauthorizedException("You are not authorized to delete this task.");
        }

        taskRepository.delete(task);
        log.info("Task deleted: {}", taskId);
    }

    /**
     * Helper method to map a Task entity to a TaskResponse DTO.
     * This includes mapping related User and Category entities to their respective DTOs.
     *
     * @param task The Task entity.
     * @return The corresponding TaskResponse DTO.
     */
    private TaskResponse mapToResponse(Task task) {
        UserResponse ownerResponse = UserResponse.builder()
                .id(task.getOwner().getId())
                .fullName(task.getOwner().getFullName())
                .email(task.getOwner().getEmail())
                .roles(task.getOwner().getRoles())
                .build();

        CategoryResponse categoryResponse = CategoryResponse.builder()
                .id(task.getCategory().getId())
                .name(task.getCategory().getName())
                .build();

        return TaskResponse.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .dueDate(task.getDueDate())
                .status(task.getStatus())
                .createdAt(task.getCreatedAt())
                .updatedAt(task.getUpdatedAt())
                .category(categoryResponse)
                .owner(ownerResponse)
                .build();
    }
}
```
```java
package com.alx.pms.task.service;

import com.alx.pms.exception.ForbiddenException;
import com.alx.pms.exception.ResourceNotFoundException;
import com.alx.pms.exception.ValidationException;
import com.alx.pms.model.Project;
import com.alx.pms.model.Task;
import com.alx.pms.model.TaskStatus;
import com.alx.pms.model.User;
import com.alx.pms.task.dto.TaskRequest;
import com.alx.pms.task.dto.TaskResponse;
import com.alx.pms.task.repository.TaskRepository;
import com.alx.pms.project.service.ProjectService;
import com.alx.pms.user.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectService projectService;
    private final UserService userService;

    @Transactional
    public TaskResponse createTask(Long projectId, TaskRequest request, Long currentUserId) {
        log.info("Creating new task for project ID: {} by user ID: {}", projectId, currentUserId);
        Project project = projectService.findProjectEntityById(projectId, currentUserId); // Validates ownership

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setProject(project);
        task.setDueDate(request.getDueDate());
        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }

        if (request.getAssignedToUserId() != null) {
            User assignedToUser = userService.findUserEntityById(request.getAssignedToUserId());
            task.setAssignedTo(assignedToUser);
        }

        Task savedTask = taskRepository.save(task);
        log.info("Task '{}' created with ID: {} for project ID: {}", savedTask.getTitle(), savedTask.getId(), projectId);
        return convertToDto(savedTask);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "tasks", key = "#id") // Cache task by ID
    public TaskResponse getTaskById(Long id, Long currentUserId) {
        log.debug("Fetching task by ID: {}", id);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Task not found with ID: {}", id);
                    return new ResourceNotFoundException("Task not found with ID: " + id);
                });

        if (!Objects.equals(task.getProject().getOwner().getId(), currentUserId)) {
            log.warn("User {} attempted to access task {} from a project not owned by them.", currentUserId, id);
            throw new ForbiddenException("You are not authorized to view this task.");
        }
        return convertToDto(task);
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksByProjectId(Long projectId, Long currentUserId) {
        log.debug("Fetching tasks for project ID: {} by user ID: {}", projectId, currentUserId);
        Project project = projectService.findProjectEntityById(projectId, currentUserId); // Validates ownership
        return taskRepository.findByProject(project).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> getTasksAssignedToUser(Long assignedToUserId, Long currentUserId) {
        log.debug("Fetching tasks assigned to user ID: {} by current user ID: {}", assignedToUserId, currentUserId);
        if (!Objects.equals(assignedToUserId, currentUserId)) {
            throw new ForbiddenException("You are not authorized to view tasks assigned to other users.");
        }
        User assignedToUser = userService.findUserEntityById(assignedToUserId);
        return taskRepository.findByAssignedTo(assignedToUser).stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Transactional
    @CachePut(value = "tasks", key = "#id") // Update cache after task update
    public TaskResponse updateTask(Long id, TaskRequest request, Long currentUserId) {
        log.info("Updating task with ID: {} by user ID: {}", id, currentUserId);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Task not found for update with ID: {}", id);
                    return new ResourceNotFoundException("Task not found with ID: " + id);
                });

        if (!Objects.equals(task.getProject().getOwner().getId(), currentUserId)) {
            log.warn("User {} attempted to update task {} from a project not owned by them.", currentUserId, id);
            throw new ForbiddenException("You are not authorized to update this task.");
        }

        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setDueDate(request.getDueDate());

        if (request.getStatus() != null) {
            task.setStatus(request.getStatus());
        }

        if (request.getAssignedToUserId() != null) {
            User assignedToUser = userService.findUserEntityById(request.getAssignedToUserId());
            task.setAssignedTo(assignedToUser);
        } else if (request.getAssignedToUserId() == null && task.getAssignedTo() != null) {
            // If request explicitly sets assignedToUserId to null, unassign the task
            task.setAssignedTo(null);
        }

        Task updatedTask = taskRepository.save(task);
        log.info("Task with ID {} updated successfully.", id);
        return convertToDto(updatedTask);
    }

    @Transactional
    @CacheEvict(value = "tasks", key = "#id") // Evict task from cache on deletion
    public void deleteTask(Long id, Long currentUserId) {
        log.info("Attempting to delete task with ID: {} by user ID: {}", id, currentUserId);
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Task not found for deletion with ID: {}", id);
                    return new ResourceNotFoundException("Task not found with ID: " + id);
                });

        if (!Objects.equals(task.getProject().getOwner().getId(), currentUserId)) {
            log.warn("User {} attempted to delete task {} from a project not owned by them.", currentUserId, id);
            throw new ForbiddenException("You are not authorized to delete this task.");
        }

        taskRepository.delete(task);
        log.info("Task with ID {} deleted successfully.", id);
    }

    public TaskResponse convertToDto(Task task) {
        TaskResponse dto = new TaskResponse();
        dto.setId(task.getId());
        dto.setTitle(task.getTitle());
        dto.setDescription(task.getDescription());
        // For project, we can return a simplified DTO or just ID/name to avoid deep nesting
        // For simplicity, we create a light ProjectResponse here.
        if (task.getProject() != null) {
            dto.setProject(projectService.convertToDto(task.getProject()));
        }
        if (task.getAssignedTo() != null) {
            dto.setAssignedTo(userService.convertToDto(task.getAssignedTo()));
        }
        dto.setStatus(task.getStatus());
        dto.setDueDate(task.getDueDate());
        dto.setCreatedAt(task.getCreatedAt());
        dto.setUpdatedAt(task.getUpdatedAt());
        return dto;
    }
}
```
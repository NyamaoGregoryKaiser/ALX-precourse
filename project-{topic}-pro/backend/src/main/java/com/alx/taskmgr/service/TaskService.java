package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.task.TaskCreateRequest;
import com.alx.taskmgr.dto.task.TaskResponse;
import com.alx.taskmgr.dto.task.TaskUpdateRequest;
import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.entity.Project;
import com.alx.taskmgr.entity.Task;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.entity.enums.TaskStatus;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.exception.UnauthorizedException;
import com.alx.taskmgr.repository.ProjectRepository;
import com.alx.taskmgr.repository.TaskRepository;
import com.alx.taskmgr.repository.UserRepository;
import com.alx.taskmgr.util.UserContext;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service for managing task operations.
 */
@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    /**
     * Creates a new task within a specified project.
     * The current user must be a collaborator or owner of the project.
     * @param request TaskCreateRequest DTO.
     * @return TaskResponse DTO of the created task.
     * @throws ResourceNotFoundException if project or assigned user not found.
     * @throws UnauthorizedException if the current user is not authorized for the project.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "tasksByProject", key = "#request.projectId"),
            @CacheEvict(value = "tasksByUser", allEntries = true),
            @CacheEvict(value = "taskById", allEntries = true)
    })
    public TaskResponse createTask(TaskCreateRequest request) {
        Long currentUserId = UserContext.getCurrentUserId();

        Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + request.getProjectId()));

        // Check if current user is owner or collaborator of the project
        if (!project.getOwner().getId().equals(currentUserId) &&
            project.getCollaborators().stream().noneMatch(c -> c.getId().equals(currentUserId))) {
            throw new UnauthorizedException("You are not authorized to create tasks in this project.");
        }

        User assignedTo = null;
        if (request.getAssignedToId() != null) {
            assignedTo = userRepository.findById(request.getAssignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assigned user not found with id: " + request.getAssignedToId()));
            // Ensure assigned user is also a collaborator (optional, depending on business logic)
            if (!project.getCollaborators().contains(assignedTo) && !project.getOwner().equals(assignedTo)) {
                throw new IllegalArgumentException("Assigned user must be a collaborator or owner of the project.");
            }
        }

        Task task = new Task();
        task.setTitle(request.getTitle());
        task.setDescription(request.getDescription());
        task.setProject(project);
        task.setAssignedTo(assignedTo);
        task.setDueDate(request.getDueDate());
        task.setStatus(TaskStatus.OPEN); // Default status

        Task savedTask = taskRepository.save(task);
        return mapToTaskResponse(savedTask);
    }

    /**
     * Retrieves a task by its ID.
     * The current user must be a collaborator or owner of the associated project.
     * @param id The ID of the task.
     * @return TaskResponse DTO.
     * @throws ResourceNotFoundException if the task is not found.
     * @throws UnauthorizedException if the current user is not authorized to view the task.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "taskById", key = "#id")
    public TaskResponse getTaskById(Long id) {
        Long currentUserId = UserContext.getCurrentUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));

        Project project = task.getProject();
        if (!project.getOwner().getId().equals(currentUserId) &&
            project.getCollaborators().stream().noneMatch(c -> c.getId().equals(currentUserId))) {
            throw new UnauthorizedException("You are not authorized to view this task.");
        }

        return mapToTaskResponse(task);
    }

    /**
     * Retrieves all tasks for a specific project.
     * The current user must be a collaborator or owner of the project.
     * @param projectId The ID of the project.
     * @return List of TaskResponse DTOs.
     * @throws ResourceNotFoundException if the project is not found.
     * @throws UnauthorizedException if the current user is not authorized for the project.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "tasksByProject", key = "#projectId")
    public List<TaskResponse> getTasksByProjectId(Long projectId) {
        Long currentUserId = UserContext.getCurrentUserId();
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + projectId));

        if (!project.getOwner().getId().equals(currentUserId) &&
            project.getCollaborators().stream().noneMatch(c -> c.getId().equals(currentUserId))) {
            throw new UnauthorizedException("You are not authorized to view tasks in this project.");
        }

        return taskRepository.findByProjectId(projectId).stream()
                .map(this::mapToTaskResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves all tasks assigned to the current user.
     * @return List of TaskResponse DTOs.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "tasksByUser", key = "#root.methodName + '-' + T(com.alx.taskmgr.util.UserContext).getCurrentUserId()")
    public List<TaskResponse> getTasksAssignedToCurrentUser() {
        Long currentUserId = UserContext.getCurrentUserId();
        return taskRepository.findByAssignedToId(currentUserId).stream()
                .map(this::mapToTaskResponse)
                .collect(Collectors.toList());
    }

    /**
     * Updates an existing task.
     * The current user must be a collaborator or owner of the associated project.
     * @param id The ID of the task to update.
     * @param request TaskUpdateRequest DTO containing updated details.
     * @return TaskResponse DTO of the updated task.
     * @throws ResourceNotFoundException if task, project, or assigned user not found.
     * @throws UnauthorizedException if the current user is not authorized for the project.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "tasksByProject", key = "#result.projectId"),
            @CacheEvict(value = "tasksByUser", allEntries = true),
            @CacheEvict(value = "taskById", key = "#id")
    })
    public TaskResponse updateTask(Long id, TaskUpdateRequest request) {
        Long currentUserId = UserContext.getCurrentUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));

        Project project = task.getProject();
        if (!project.getOwner().getId().equals(currentUserId) &&
            project.getCollaborators().stream().noneMatch(c -> c.getId().equals(currentUserId))) {
            throw new UnauthorizedException("You are not authorized to update this task.");
        }

        Optional.ofNullable(request.getTitle()).ifPresent(task::setTitle);
        Optional.ofNullable(request.getDescription()).ifPresent(task::setDescription);
        Optional.ofNullable(request.getStatus()).ifPresent(task::setStatus);
        Optional.ofNullable(request.getDueDate()).ifPresent(task::setDueDate);

        if (request.getAssignedToId() != null) {
            User assignedTo = userRepository.findById(request.getAssignedToId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assigned user not found with id: " + request.getAssignedToId()));
            // Ensure assigned user is also a collaborator (optional)
            if (!project.getCollaborators().contains(assignedTo) && !project.getOwner().equals(assignedTo)) {
                throw new IllegalArgumentException("Assigned user must be a collaborator or owner of the project.");
            }
            task.setAssignedTo(assignedTo);
        } else if (request.getAssignedToId() == null && request.getTitle() == null && request.getDescription() == null && request.getStatus() == null && request.getDueDate() == null) {
            // This case handles explicitly setting assignedTo to null if no other fields are updated
            // It allows for unassigning a task without providing other fields.
            // If the request for assignedToId is explicitly null, it unassigns
            task.setAssignedTo(null);
        }


        Task updatedTask = taskRepository.save(task);
        return mapToTaskResponse(updatedTask);
    }

    /**
     * Deletes a task.
     * The current user must be the owner of the associated project.
     * @param id The ID of the task to delete.
     * @throws ResourceNotFoundException if the task is not found.
     * @throws UnauthorizedException if the current user is not authorized to delete the task.
     */
    @Transactional
    @Caching(evict = {
            @CacheEvict(value = "tasksByProject", key = "#result.project.id", condition = "#result != null"),
            @CacheEvict(value = "tasksByUser", allEntries = true),
            @CacheEvict(value = "taskById", key = "#id")
    })
    public void deleteTask(Long id) {
        Long currentUserId = UserContext.getCurrentUserId();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));

        Project project = task.getProject();
        if (!project.getOwner().getId().equals(currentUserId)) {
            // Only project owner can delete tasks in this implementation
            throw new UnauthorizedException("You are not authorized to delete this task. Only the project owner can.");
        }
        taskRepository.delete(task);
    }

    /**
     * Maps a Task entity to a TaskResponse DTO.
     * @param task The Task entity.
     * @return TaskResponse DTO.
     */
    private TaskResponse mapToTaskResponse(Task task) {
        TaskResponse response = new TaskResponse();
        response.setId(task.getId());
        response.setTitle(task.getTitle());
        response.setDescription(task.getDescription());
        response.setStatus(task.getStatus());
        response.setProjectId(task.getProject().getId());
        response.setDueDate(task.getDueDate());
        response.setCreatedAt(task.getCreatedAt());
        response.setUpdatedAt(task.getUpdatedAt());

        if (task.getAssignedTo() != null) {
            UserResponse assignedToResponse = new UserResponse();
            assignedToResponse.setId(task.getAssignedTo().getId());
            assignedToResponse.setUsername(task.getAssignedTo().getUsername());
            assignedToResponse.setEmail(task.getAssignedTo().getEmail());
            response.setAssignedTo(assignedToResponse);
        }
        return response;
    }
}
```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.TaskDTO;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.model.Category;
import com.alx.taskmgr.model.Task;
import com.alx.taskmgr.model.User;
import com.alx.taskmgr.repository.CategoryRepository;
import com.alx.taskmgr.repository.TaskRepository;
import com.alx.taskmgr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "tasks", key = "#userId")
    public List<TaskDTO> getAllTasks(Long userId) {
        return taskRepository.findByUserId(userId).stream()
                .map(this::mapTaskToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "task", key = "#id")
    public TaskDTO getTaskById(Long id, Long userId) {
        Task task = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
        return mapTaskToDTO(task);
    }

    @Transactional
    @CacheEvict(value = {"tasks", "task"}, allEntries = true)
    public TaskDTO createTask(TaskDTO taskDTO, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        Category category = null;
        if (taskDTO.getCategoryId() != null) {
            category = categoryRepository.findByIdAndUserId(taskDTO.getCategoryId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + taskDTO.getCategoryId() + " for this user."));
        }

        Task task = Task.builder()
                .title(taskDTO.getTitle())
                .description(taskDTO.getDescription())
                .dueDate(taskDTO.getDueDate())
                .completed(false)
                .user(user)
                .category(category)
                .build();
        return mapTaskToDTO(taskRepository.save(task));
    }

    @Transactional
    @CacheEvict(value = {"tasks", "task"}, allEntries = true)
    public TaskDTO updateTask(Long id, TaskDTO taskDTO, Long userId) {
        Task existingTask = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));

        Category category = null;
        if (taskDTO.getCategoryId() != null) {
            category = categoryRepository.findByIdAndUserId(taskDTO.getCategoryId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + taskDTO.getCategoryId() + " for this user."));
        }

        existingTask.setTitle(taskDTO.getTitle());
        existingTask.setDescription(taskDTO.getDescription());
        existingTask.setDueDate(taskDTO.getDueDate());
        existingTask.setCompleted(taskDTO.isCompleted());
        existingTask.setCategory(category);
        return mapTaskToDTO(taskRepository.save(existingTask));
    }

    @Transactional
    @CacheEvict(value = {"tasks", "task"}, allEntries = true)
    public void deleteTask(Long id, Long userId) {
        Task task = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
        taskRepository.delete(task);
    }

    @Transactional
    @CacheEvict(value = {"tasks", "task"}, allEntries = true)
    public TaskDTO markTaskComplete(Long id, Long userId, boolean completed) {
        Task existingTask = taskRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
        existingTask.setCompleted(completed);
        return mapTaskToDTO(taskRepository.save(existingTask));
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> getTasksByCompletionStatus(Long userId, boolean completed) {
        return taskRepository.findByUserIdAndCompleted(userId, completed).stream()
                .map(this::mapTaskToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> getOverdueTasks(Long userId) {
        return taskRepository.findByUserIdAndDueDateBefore(userId, LocalDate.now()).stream()
                .map(this::mapTaskToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> getTasksByCategory(Long userId, Long categoryId) {
        return taskRepository.findByUserIdAndCategoryId(userId, categoryId).stream()
                .map(this::mapTaskToDTO)
                .collect(Collectors.toList());
    }

    private TaskDTO mapTaskToDTO(Task task) {
        return TaskDTO.builder()
                .id(task.getId())
                .title(task.getTitle())
                .description(task.getDescription())
                .dueDate(task.getDueDate())
                .completed(task.isCompleted())
                .userId(task.getUser().getId())
                .categoryId(task.getCategory() != null ? task.getCategory().getId() : null)
                .categoryName(task.getCategory() != null ? task.getCategory().getName() : null)
                .build();
    }
}
```
package com.alx.taskmanager.service;

import com.alx.taskmanager.dto.TaskDTO;
import com.alx.taskmanager.exception.ResourceNotFoundException;
import com.alx.taskmanager.model.Project;
import com.alx.taskmanager.model.Task;
import com.alx.taskmanager.model.User;
import com.alx.taskmanager.repository.ProjectRepository;
import com.alx.taskmanager.repository.TaskRepository;
import com.alx.taskmanager.repository.UserRepository;
import com.alx.taskmanager.security.UserDetailsImpl;
import com.alx.taskmanager.util.MapperUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final MapperUtil mapperUtil;

    @Transactional
    public TaskDTO createTask(TaskDTO taskDTO) {
        Project project = projectRepository.findById(taskDTO.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + taskDTO.getProjectId()));

        // Reporter is the currently authenticated user
        UserDetailsImpl currentUser = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User reporter = userRepository.findById(currentUser.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Reporter user not found with id: " + currentUser.getId()));


        Task task = new Task(
                taskDTO.getTitle(),
                taskDTO.getDescription(),
                taskDTO.getStatus(),
                taskDTO.getPriority(),
                taskDTO.getDueDate(),
                project,
                reporter
        );

        if (taskDTO.getAssigneeId() != null) {
            User assignee = userRepository.findById(taskDTO.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee user not found with id: " + taskDTO.getAssigneeId()));
            task.setAssignee(assignee);
        }

        return mapperUtil.toTaskDTO(taskRepository.save(task));
    }

    @Cacheable(value = "tasks", key = "#id")
    @Transactional(readOnly = true)
    public TaskDTO getTaskById(Long id) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));
        return mapperUtil.toTaskDTO(task);
    }

    @Cacheable(value = "tasks")
    @Transactional(readOnly = true)
    public List<TaskDTO> getAllTasks() {
        return taskRepository.findAll().stream()
                .map(mapperUtil::toTaskDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> getTasksByProjectId(Long projectId) {
        return taskRepository.findByProjectId(projectId).stream()
                .map(mapperUtil::toTaskDTO)
                .collect(Collectors.toList());
    }

    @CachePut(value = "tasks", key = "#id")
    @Transactional
    public TaskDTO updateTask(Long id, TaskDTO taskDTO) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + id));

        task.setTitle(taskDTO.getTitle());
        task.setDescription(taskDTO.getDescription());
        if (taskDTO.getStatus() != null) task.setStatus(taskDTO.getStatus());
        if (taskDTO.getPriority() != null) task.setPriority(taskDTO.getPriority());
        if (taskDTO.getDueDate() != null) task.setDueDate(taskDTO.getDueDate());

        if (taskDTO.getProjectId() != null && !task.getProject().getId().equals(taskDTO.getProjectId())) {
            Project newProject = projectRepository.findById(taskDTO.getProjectId())
                    .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + taskDTO.getProjectId()));
            task.setProject(newProject);
        }

        if (taskDTO.getAssigneeId() != null && (task.getAssignee() == null || !task.getAssignee().getId().equals(taskDTO.getAssigneeId()))) {
            User newAssignee = userRepository.findById(taskDTO.getAssigneeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Assignee user not found with id: " + taskDTO.getAssigneeId()));
            task.setAssignee(newAssignee);
        } else if (taskDTO.getAssigneeId() == null) {
            task.setAssignee(null); // Unassign
        }

        return mapperUtil.toTaskDTO(taskRepository.save(task));
    }

    @CacheEvict(value = "tasks", key = "#id")
    @Transactional
    public void deleteTask(Long id) {
        if (!taskRepository.existsById(id)) {
            throw new ResourceNotFoundException("Task not found with id: " + id);
        }
        taskRepository.deleteById(id);
    }
}
package com.alx.taskmanager.service;

import com.alx.taskmanager.dto.TaskDTO;
import com.alx.taskmanager.exception.ResourceNotFoundException;
import com.alx.taskmanager.model.*;
import com.alx.taskmanager.repository.ProjectRepository;
import com.alx.taskmanager.repository.TaskRepository;
import com.alx.taskmanager.repository.UserRepository;
import com.alx.taskmanager.security.UserDetailsImpl;
import com.alx.taskmanager.util.MapperUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private MapperUtil mapperUtil;

    @InjectMocks
    private TaskService taskService;

    private User reporter;
    private User assignee;
    private Project project;
    private Task task;
    private TaskDTO taskDTO;
    private UserDetailsImpl userDetails;

    @BeforeEach
    void setUp() {
        // Setup current authenticated user for reporter
        Set<GrantedAuthority> authorities = new HashSet<>();
        authorities.add(new SimpleGrantedAuthority(UserRole.ROLE_USER.name()));
        userDetails = new UserDetailsImpl(1L, "reporter", "reporter@example.com", "pass", authorities);

        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getPrincipal()).thenReturn(userDetails);

        reporter = new User(1L, "reporter", "password", "reporter@example.com", new HashSet<>(), new HashSet<>(), new HashSet<>());
        assignee = new User(2L, "assignee", "password", "assignee@example.com", new HashSet<>(), new HashSet<>(), new HashSet<>());
        project = new Project(10L, "Test Project", "Description", null, null, new HashSet<>(), new HashSet<>(Set.of(reporter, assignee)));

        task = new Task(100L, "Test Task", "Task Description", TaskStatus.OPEN, TaskPriority.MEDIUM,
                LocalDateTime.now().plusDays(5), project, assignee, reporter, null, null);

        taskDTO = new TaskDTO();
        taskDTO.setId(100L);
        taskDTO.setTitle("Test Task");
        taskDTO.setDescription("Task Description");
        taskDTO.setStatus(TaskStatus.OPEN);
        taskDTO.setPriority(TaskPriority.MEDIUM);
        taskDTO.setDueDate(LocalDateTime.now().plusDays(5));
        taskDTO.setProjectId(10L);
        taskDTO.setAssigneeId(2L);
        taskDTO.setReporterId(1L);
    }

    @Test
    void createTask_ValidTaskDTO_ReturnsCreatedTaskDTO() {
        TaskDTO createRequest = new TaskDTO();
        createRequest.setTitle("New Task");
        createRequest.setDescription("New Task Desc");
        createRequest.setProjectId(10L);
        createRequest.setAssigneeId(2L);
        createRequest.setStatus(TaskStatus.OPEN);
        createRequest.setPriority(TaskPriority.HIGH);

        Task createdTaskEntity = new Task(101L, "New Task", "New Task Desc", TaskStatus.OPEN, TaskPriority.HIGH, null, project, assignee, reporter, null, null);
        TaskDTO createdTaskDTO = new TaskDTO();
        createdTaskDTO.setId(101L);
        createdTaskDTO.setTitle("New Task");

        when(projectRepository.findById(10L)).thenReturn(Optional.of(project));
        when(userRepository.findById(userDetails.getId())).thenReturn(Optional.of(reporter));
        when(userRepository.findById(2L)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenReturn(createdTaskEntity);
        when(mapperUtil.toTaskDTO(createdTaskEntity)).thenReturn(createdTaskDTO);

        TaskDTO result = taskService.createTask(createRequest);

        assertNotNull(result);
        assertEquals("New Task", result.getTitle());
        verify(projectRepository, times(1)).findById(10L);
        verify(userRepository, times(1)).findById(userDetails.getId());
        verify(userRepository, times(1)).findById(2L);
        verify(taskRepository, times(1)).save(any(Task.class));
        verify(mapperUtil, times(1)).toTaskDTO(createdTaskEntity);
    }

    @Test
    void createTask_InvalidProjectId_ThrowsResourceNotFoundException() {
        TaskDTO createRequest = new TaskDTO();
        createRequest.setProjectId(99L);
        createRequest.setTitle("New Task");

        when(projectRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> taskService.createTask(createRequest));
        verify(projectRepository, times(1)).findById(99L);
        verify(userRepository, never()).findById(anyLong());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void getTaskById_ExistingTask_ReturnsTaskDTO() {
        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(mapperUtil.toTaskDTO(task)).thenReturn(taskDTO);

        TaskDTO foundTask = taskService.getTaskById(100L);

        assertNotNull(foundTask);
        assertEquals(task.getTitle(), foundTask.getTitle());
        verify(taskRepository, times(1)).findById(100L);
        verify(mapperUtil, times(1)).toTaskDTO(task);
    }

    @Test
    void getTaskById_NonExistingTask_ThrowsResourceNotFoundException() {
        when(taskRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> taskService.getTaskById(999L));
        verify(taskRepository, times(1)).findById(999L);
        verify(mapperUtil, never()).toTaskDTO(any());
    }

    @Test
    void getAllTasks_ReturnsListOfTaskDTOs() {
        Task task2 = new Task(102L, "Task 2", "Desc 2", TaskStatus.IN_PROGRESS, TaskPriority.LOW, null, project, null, reporter, null, null);
        TaskDTO taskDTO2 = new TaskDTO();
        taskDTO2.setId(102L);
        taskDTO2.setTitle("Task 2");

        when(taskRepository.findAll()).thenReturn(List.of(task, task2));
        when(mapperUtil.toTaskDTO(task)).thenReturn(taskDTO);
        when(mapperUtil.toTaskDTO(task2)).thenReturn(taskDTO2);

        List<TaskDTO> tasks = taskService.getAllTasks();

        assertNotNull(tasks);
        assertEquals(2, tasks.size());
        assertEquals(taskDTO.getTitle(), tasks.get(0).getTitle());
        assertEquals(taskDTO2.getTitle(), tasks.get(1).getTitle());
        verify(taskRepository, times(1)).findAll();
        verify(mapperUtil, times(2)).toTaskDTO(any(Task.class));
    }

    @Test
    void getTasksByProjectId_ExistingProject_ReturnsListOfTaskDTOs() {
        Task task2 = new Task(102L, "Task 2", "Desc 2", TaskStatus.IN_PROGRESS, TaskPriority.LOW, null, project, null, reporter, null, null);
        TaskDTO taskDTO2 = new TaskDTO();
        taskDTO2.setId(102L);
        taskDTO2.setTitle("Task 2");

        when(taskRepository.findByProjectId(10L)).thenReturn(List.of(task, task2));
        when(mapperUtil.toTaskDTO(task)).thenReturn(taskDTO);
        when(mapperUtil.toTaskDTO(task2)).thenReturn(taskDTO2);

        List<TaskDTO> tasks = taskService.getTasksByProjectId(10L);

        assertNotNull(tasks);
        assertEquals(2, tasks.size());
        assertEquals(taskDTO.getTitle(), tasks.get(0).getTitle());
        assertEquals(taskDTO2.getTitle(), tasks.get(1).getTitle());
        verify(taskRepository, times(1)).findByProjectId(10L);
        verify(mapperUtil, times(2)).toTaskDTO(any(Task.class));
    }

    @Test
    void updateTask_ExistingTask_ReturnsUpdatedTaskDTO() {
        TaskDTO updateRequest = new TaskDTO();
        updateRequest.setTitle("Updated Title");
        updateRequest.setDescription("Updated Desc");
        updateRequest.setStatus(TaskStatus.DONE);
        updateRequest.setPriority(TaskPriority.URGENT);
        updateRequest.setAssigneeId(1L); // Assign to reporter

        Task updatedTaskEntity = new Task(100L, "Updated Title", "Updated Desc", TaskStatus.DONE, TaskPriority.URGENT,
                LocalDateTime.now().plusDays(5), project, reporter, reporter, null, null);
        TaskDTO updatedTaskDTO = new TaskDTO();
        updatedTaskDTO.setId(100L);
        updatedTaskDTO.setTitle("Updated Title");
        updatedTaskDTO.setStatus(TaskStatus.DONE);
        updatedTaskDTO.setAssigneeId(1L);

        when(taskRepository.findById(100L)).thenReturn(Optional.of(task));
        when(userRepository.findById(1L)).thenReturn(Optional.of(reporter)); // for new assignee
        when(taskRepository.save(any(Task.class))).thenReturn(updatedTaskEntity);
        when(mapperUtil.toTaskDTO(updatedTaskEntity)).thenReturn(updatedTaskDTO);

        TaskDTO result = taskService.updateTask(100L, updateRequest);

        assertNotNull(result);
        assertEquals("Updated Title", result.getTitle());
        assertEquals(TaskStatus.DONE, result.getStatus());
        assertEquals(1L, result.getAssigneeId());
        verify(taskRepository, times(1)).findById(100L);
        verify(userRepository, times(1)).findById(1L);
        verify(taskRepository, times(1)).save(task);
        verify(mapperUtil, times(1)).toTaskDTO(updatedTaskEntity);
    }

    @Test
    void updateTask_NonExistingTask_ThrowsResourceNotFoundException() {
        TaskDTO updateRequest = new TaskDTO();
        when(taskRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> taskService.updateTask(999L, updateRequest));
        verify(taskRepository, times(1)).findById(999L);
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    void deleteTask_ExistingTask_DeletesTask() {
        when(taskRepository.existsById(100L)).thenReturn(true);
        doNothing().when(taskRepository).deleteById(100L);

        taskService.deleteTask(100L);

        verify(taskRepository, times(1)).existsById(100L);
        verify(taskRepository, times(1)).deleteById(100L);
    }

    @Test
    void deleteTask_NonExistingTask_ThrowsResourceNotFoundException() {
        when(taskRepository.existsById(999L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> taskService.deleteTask(999L));
        verify(taskRepository, times(1)).existsById(999L);
        verify(taskRepository, never()).deleteById(anyLong());
    }
}
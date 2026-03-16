package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.task.TaskCreateRequest;
import com.alx.taskmgr.dto.task.TaskResponse;
import com.alx.taskmgr.dto.task.TaskUpdateRequest;
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
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the TaskService.
 * Mocks dependencies to isolate the service logic.
 */
@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectRepository projectRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TaskService taskService;

    // Mocked static for UserContext
    private MockedStatic<UserContext> mockedUserContext;

    private User currentUser;
    private User collaboratorUser;
    private Project project;
    private Task task;

    @BeforeEach
    void setUp() {
        // Initialize UserContext mock
        mockedUserContext = mockStatic(UserContext.class);
        mockedUserContext.when(UserContext::getCurrentUserId).thenReturn(1L); // Assume current user ID is 1L

        currentUser = new User();
        currentUser.setId(1L);
        currentUser.setUsername("currentuser");
        currentUser.setEmail("current@example.com");

        collaboratorUser = new User();
        collaboratorUser.setId(2L);
        collaboratorUser.setUsername("collaborator");
        collaboratorUser.setEmail("collaborator@example.com");

        project = new Project();
        project.setId(10L);
        project.setName("Test Project");
        project.setOwner(currentUser); // Current user is owner
        project.setCollaborators(new HashSet<>(Set.of(currentUser, collaboratorUser)));

        task = new Task();
        task.setId(100L);
        task.setTitle("Test Task");
        task.setDescription("Description for test task");
        task.setStatus(TaskStatus.OPEN);
        task.setProject(project);
        task.setAssignedTo(collaboratorUser);
        task.setDueDate(LocalDateTime.now().plusDays(5));
    }

    @AfterEach
    void tearDown() {
        // Close the mocked static
        mockedUserContext.close();
    }

    @Test
    @DisplayName("Should create a task when authorized")
    void shouldCreateTaskWhenAuthorized() {
        TaskCreateRequest request = new TaskCreateRequest();
        request.setTitle("New Task");
        request.setDescription("New task description");
        request.setProjectId(project.getId());
        request.setAssignedToId(collaboratorUser.getId());
        request.setDueDate(LocalDateTime.now().plusDays(7));

        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(userRepository.findById(collaboratorUser.getId())).thenReturn(Optional.of(collaboratorUser));
        when(taskRepository.save(any(Task.class))).thenReturn(task); // Return a mock task

        TaskResponse response = taskService.createTask(request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Test Task"); // Mocked task title
        assertThat(response.getProjectId()).isEqualTo(project.getId());
        assertThat(response.getAssignedTo().getId()).isEqualTo(collaboratorUser.getId());
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw UnauthorizedException when creating task in unauthorized project")
    void shouldThrowUnauthorizedExceptionWhenCreatingTaskInUnauthorizedProject() {
        Project unauthorizedProject = new Project();
        unauthorizedProject.setId(11L);
        unauthorizedProject.setOwner(new User()); // Different owner
        unauthorizedProject.getCollaborators().add(new User()); // Different collaborator
        unauthorizedProject.getOwner().setId(99L);
        unauthorizedProject.getCollaborators().iterator().next().setId(98L);


        TaskCreateRequest request = new TaskCreateRequest();
        request.setProjectId(unauthorizedProject.getId());

        when(projectRepository.findById(unauthorizedProject.getId())).thenReturn(Optional.of(unauthorizedProject));

        assertThrows(UnauthorizedException.class, () -> taskService.createTask(request));
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should get task by ID when authorized")
    void shouldGetTaskByIdWhenAuthorized() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        TaskResponse response = taskService.getTaskById(task.getId());

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(task.getId());
        assertThat(response.getTitle()).isEqualTo(task.getTitle());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when getting non-existent task")
    void shouldThrowResourceNotFoundExceptionWhenGettingNonExistentTask() {
        when(taskRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> taskService.getTaskById(999L));
    }

    @Test
    @DisplayName("Should update task successfully when authorized")
    void shouldUpdateTaskWhenAuthorized() {
        TaskUpdateRequest request = new TaskUpdateRequest();
        request.setTitle("Updated Task Title");
        request.setStatus(TaskStatus.COMPLETED);

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(task);

        TaskResponse response = taskService.updateTask(task.getId(), request);

        assertThat(response).isNotNull();
        assertThat(response.getTitle()).isEqualTo("Updated Task Title");
        assertThat(response.getStatus()).isEqualTo(TaskStatus.COMPLETED);
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw UnauthorizedException when updating task in unauthorized project")
    void shouldThrowUnauthorizedExceptionWhenUpdatingTaskInUnauthorizedProject() {
        Project unauthorizedProject = new Project();
        unauthorizedProject.setId(11L);
        unauthorizedProject.setOwner(new User()); // Different owner
        unauthorizedProject.getOwner().setId(99L); // ID 99
        unauthorizedProject.setCollaborators(Collections.emptySet()); // No collaborators for current user

        Task unauthorizedTask = new Task();
        unauthorizedTask.setId(101L);
        unauthorizedTask.setProject(unauthorizedProject);

        TaskUpdateRequest request = new TaskUpdateRequest();
        request.setTitle("Unauthorized update");

        when(taskRepository.findById(unauthorizedTask.getId())).thenReturn(Optional.of(unauthorizedTask));

        assertThrows(UnauthorizedException.class, () -> taskService.updateTask(unauthorizedTask.getId(), request));
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should delete task successfully when owner")
    void shouldDeleteTaskWhenOwner() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        doNothing().when(taskRepository).delete(any(Task.class));

        taskService.deleteTask(task.getId());

        verify(taskRepository, times(1)).delete(any(Task.class));
    }

    @Test
    @DisplayName("Should throw UnauthorizedException when non-owner tries to delete task")
    void shouldThrowUnauthorizedExceptionWhenNonOwnerDeletesTask() {
        mockedUserContext.when(UserContext::getCurrentUserId).thenReturn(99L); // Simulate different user
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThrows(UnauthorizedException.class, () -> taskService.deleteTask(task.getId()));
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    @DisplayName("Should get tasks by project ID when authorized")
    void shouldGetTasksByProjectIdWhenAuthorized() {
        when(projectRepository.findById(project.getId())).thenReturn(Optional.of(project));
        when(taskRepository.findByProjectId(project.getId())).thenReturn(List.of(task));

        List<TaskResponse> tasks = taskService.getTasksByProjectId(project.getId());

        assertThat(tasks).hasSize(1);
        assertThat(tasks.get(0).getTitle()).isEqualTo(task.getTitle());
    }

    @Test
    @DisplayName("Should get tasks assigned to current user")
    void shouldGetTasksAssignedToCurrentUser() {
        // Configure UserContext mock to return currentUserId when called by service
        mockedUserContext.when(UserContext::getCurrentUserId).thenReturn(currentUser.getId());

        Task taskAssignedToCurrentUser = new Task();
        taskAssignedToCurrentUser.setId(102L);
        taskAssignedToCurrentUser.setTitle("Task for current user");
        taskAssignedToCurrentUser.setProject(project);
        taskAssignedToCurrentUser.setAssignedTo(currentUser);

        when(taskRepository.findByAssignedToId(currentUser.getId())).thenReturn(List.of(taskAssignedToCurrentUser));

        List<TaskResponse> tasks = taskService.getTasksAssignedToCurrentUser();

        assertThat(tasks).hasSize(1);
        assertThat(tasks.get(0).getAssignedTo().getId()).isEqualTo(currentUser.getId());
    }
}
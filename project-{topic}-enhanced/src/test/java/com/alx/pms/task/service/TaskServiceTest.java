```java
package com.alx.pms.task.service;

import com.alx.pms.exception.ForbiddenException;
import com.alx.pms.exception.ResourceNotFoundException;
import com.alx.pms.model.Project;
import com.alx.pms.model.Task;
import com.alx.pms.model.TaskStatus;
import com.alx.pms.model.User;
import com.alx.pms.task.dto.TaskRequest;
import com.alx.pms.task.dto.TaskResponse;
import com.alx.pms.task.repository.TaskRepository;
import com.alx.pms.project.service.ProjectService;
import com.alx.pms.user.dto.UserResponse;
import com.alx.pms.user.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private UserService userService;

    @InjectMocks
    private TaskService taskService;

    private User owner;
    private User assignedUser;
    private User otherUser;
    private Project project;
    private Task task;
    private TaskRequest taskRequest;

    @BeforeEach
    void setUp() {
        owner = new User();
        owner.setId(1L);
        owner.setUsername("ownerUser");

        assignedUser = new User();
        assignedUser.setId(2L);
        assignedUser.setUsername("assignedUser");

        otherUser = new User();
        otherUser.setId(3L);
        otherUser.setUsername("otherUser");

        project = new Project();
        project.setId(10L);
        project.setName("Test Project");
        project.setOwner(owner);

        task = new Task();
        task.setId(100L);
        task.setTitle("Test Task");
        task.setDescription("Description for test task");
        task.setProject(project);
        task.setAssignedTo(assignedUser);
        task.setStatus(TaskStatus.TO_DO);
        task.setDueDate(LocalDate.now().plusWeeks(1));
        task.setCreatedAt(LocalDateTime.now());
        task.setUpdatedAt(LocalDateTime.now());

        taskRequest = new TaskRequest();
        taskRequest.setTitle("New Task");
        taskRequest.setDescription("New task description");
        taskRequest.setAssignedToUserId(assignedUser.getId());
        taskRequest.setStatus(TaskStatus.IN_PROGRESS);
        taskRequest.setDueDate(LocalDate.now().plusDays(5));
    }

    @Test
    @DisplayName("Should create a new task successfully")
    void createTask_Success() {
        when(projectService.findProjectEntityById(project.getId(), owner.getId())).thenReturn(project);
        when(userService.findUserEntityById(assignedUser.getId())).thenReturn(assignedUser);
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        when(projectService.convertToDto(any(Project.class))).thenReturn(new com.alx.pms.project.dto.ProjectResponse());
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse());

        TaskResponse response = taskService.createTask(project.getId(), taskRequest, owner.getId());

        assertNotNull(response);
        assertEquals(task.getTitle(), response.getTitle());
        assertEquals(task.getDescription(), response.getDescription());
        assertEquals(task.getStatus(), response.getStatus());
        verify(projectService, times(1)).findProjectEntityById(project.getId(), owner.getId());
        verify(userService, times(1)).findUserEntityById(assignedUser.getId());
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw ForbiddenException if current user is not project owner when creating task")
    void createTask_NotOwner_ThrowsForbiddenException() {
        when(projectService.findProjectEntityById(project.getId(), otherUser.getId()))
                .thenThrow(new ForbiddenException("You are not authorized to access tasks in this project."));

        assertThrows(ForbiddenException.class, () -> taskService.createTask(project.getId(), taskRequest, otherUser.getId()));
        verify(projectService, times(1)).findProjectEntityById(project.getId(), otherUser.getId());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should get task by ID successfully when current user is project owner")
    void getTaskById_OwnerMatches_Success() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectService.convertToDto(any(Project.class))).thenReturn(new com.alx.pms.project.dto.ProjectResponse());
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse());

        TaskResponse response = taskService.getTaskById(task.getId(), owner.getId());

        assertNotNull(response);
        assertEquals(task.getTitle(), response.getTitle());
        verify(taskRepository, times(1)).findById(task.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when getting non-existent task")
    void getTaskById_NotFound_ThrowsException() {
        when(taskRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> taskService.getTaskById(99L, owner.getId()));
        verify(taskRepository, times(1)).findById(99L);
    }

    @Test
    @DisplayName("Should throw ForbiddenException when getting task from project not owned by current user")
    void getTaskById_NotOwner_ThrowsException() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThrows(ForbiddenException.class, () -> taskService.getTaskById(task.getId(), otherUser.getId()));
        verify(taskRepository, times(1)).findById(task.getId());
    }

    @Test
    @DisplayName("Should get all tasks for a specific project successfully")
    void getTasksByProjectId_Success() {
        when(projectService.findProjectEntityById(project.getId(), owner.getId())).thenReturn(project);
        when(taskRepository.findByProject(project)).thenReturn(List.of(task));
        when(projectService.convertToDto(any(Project.class))).thenReturn(new com.alx.pms.project.dto.ProjectResponse());
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse());

        List<TaskResponse> responses = taskService.getTasksByProjectId(project.getId(), owner.getId());

        assertNotNull(responses);
        assertFalse(responses.isEmpty());
        assertEquals(1, responses.size());
        assertEquals(task.getTitle(), responses.get(0).getTitle());
        verify(projectService, times(1)).findProjectEntityById(project.getId(), owner.getId());
        verify(taskRepository, times(1)).findByProject(project);
    }

    @Test
    @DisplayName("Should get tasks assigned to the current user successfully")
    void getTasksAssignedToUser_Success() {
        when(userService.findUserEntityById(assignedUser.getId())).thenReturn(assignedUser);
        when(taskRepository.findByAssignedTo(assignedUser)).thenReturn(List.of(task));
        when(projectService.convertToDto(any(Project.class))).thenReturn(new com.alx.pms.project.dto.ProjectResponse());
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse());

        List<TaskResponse> responses = taskService.getTasksAssignedToUser(assignedUser.getId(), assignedUser.getId());

        assertNotNull(responses);
        assertFalse(responses.isEmpty());
        assertEquals(1, responses.size());
        assertEquals(task.getTitle(), responses.get(0).getTitle());
        verify(userService, times(1)).findUserEntityById(assignedUser.getId());
        verify(taskRepository, times(1)).findByAssignedTo(assignedUser);
    }

    @Test
    @DisplayName("Should throw ForbiddenException when getting tasks assigned to another user")
    void getTasksAssignedToUser_NotCurrentUser_ThrowsForbiddenException() {
        assertThrows(ForbiddenException.class, () -> taskService.getTasksAssignedToUser(assignedUser.getId(), owner.getId()));
        verify(userService, never()).findUserEntityById(anyLong());
        verify(taskRepository, never()).findByAssignedTo(any(User.class));
    }

    @Test
    @DisplayName("Should update a task successfully when current user is project owner")
    void updateTask_OwnerMatches_Success() {
        TaskRequest updateRequest = new TaskRequest();
        updateRequest.setTitle("Updated Task Title");
        updateRequest.setDescription("Updated description");
        updateRequest.setStatus(TaskStatus.DONE);
        updateRequest.setAssignedToUserId(owner.getId());
        updateRequest.setDueDate(LocalDate.now().plusDays(2));

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(userService.findUserEntityById(owner.getId())).thenReturn(owner);
        when(taskRepository.save(any(Task.class))).thenReturn(task);
        when(projectService.convertToDto(any(Project.class))).thenReturn(new com.alx.pms.project.dto.ProjectResponse());
        when(userService.convertToDto(any(User.class))).thenReturn(new UserResponse());

        TaskResponse response = taskService.updateTask(task.getId(), updateRequest, owner.getId());

        assertNotNull(response);
        assertEquals(updateRequest.getTitle(), response.getTitle());
        assertEquals(updateRequest.getDescription(), response.getDescription());
        assertEquals(updateRequest.getStatus(), response.getStatus());
        assertEquals(owner.getId(), response.getAssignedTo().getId());
        verify(taskRepository, times(1)).findById(task.getId());
        verify(userService, times(1)).findUserEntityById(owner.getId());
        verify(taskRepository, times(1)).save(any(Task.class));
    }

    @Test
    @DisplayName("Should unassign a task if assignedToUserId is null in update request")
    void updateTask_UnassignUser_Success() {
        TaskRequest updateRequest = new TaskRequest();
        updateRequest.setTitle("Updated Task Title");
        updateRequest.setAssignedToUserId(null); // Explicitly unassign

        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(taskRepository.save(any(Task.class))).thenReturn(task); // task now has assignedTo = null
        when(projectService.convertToDto(any(Project.class))).thenReturn(new com.alx.pms.project.dto.ProjectResponse());
        // userService.convertToDto is not called for assignedTo if it's null

        TaskResponse response = taskService.updateTask(task.getId(), updateRequest, owner.getId());

        assertNotNull(response);
        assertNull(response.getAssignedTo());
        verify(taskRepository, times(1)).findById(task.getId());
        verify(userService, never()).findUserEntityById(anyLong()); // Ensure no call to findUserEntityById
        verify(taskRepository, times(1)).save(any(Task.class));
    }


    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent task")
    void updateTask_NotFound_ThrowsException() {
        TaskRequest updateRequest = new TaskRequest();
        when(taskRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> taskService.updateTask(99L, updateRequest, owner.getId()));
        verify(taskRepository, times(1)).findById(99L);
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should throw ForbiddenException when updating task from project not owned by current user")
    void updateTask_NotOwner_ThrowsException() {
        TaskRequest updateRequest = new TaskRequest();
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThrows(ForbiddenException.class, () -> taskService.updateTask(task.getId(), updateRequest, otherUser.getId()));
        verify(taskRepository, times(1)).findById(task.getId());
        verify(taskRepository, never()).save(any(Task.class));
    }

    @Test
    @DisplayName("Should delete a task successfully when current user is project owner")
    void deleteTask_OwnerMatches_Success() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        doNothing().when(taskRepository).delete(task);

        assertDoesNotThrow(() -> taskService.deleteTask(task.getId(), owner.getId()));
        verify(taskRepository, times(1)).findById(task.getId());
        verify(taskRepository, times(1)).delete(task);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent task")
    void deleteTask_NotFound_ThrowsException() {
        when(taskRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> taskService.deleteTask(99L, owner.getId()));
        verify(taskRepository, times(1)).findById(99L);
        verify(taskRepository, never()).delete(any(Task.class));
    }

    @Test
    @DisplayName("Should throw ForbiddenException when deleting task from project not owned by current user")
    void deleteTask_NotOwner_ThrowsException() {
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        assertThrows(ForbiddenException.class, () -> taskService.deleteTask(task.getId(), otherUser.getId()));
        verify(taskRepository, times(1)).findById(task.getId());
        verify(taskRepository, never()).delete(any(Task.class));
    }
}
```
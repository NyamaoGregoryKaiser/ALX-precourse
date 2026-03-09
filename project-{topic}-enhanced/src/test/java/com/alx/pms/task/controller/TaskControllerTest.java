```java
package com.alx.pms.task.controller;

import com.alx.pms.exception.ForbiddenException;
import com.alx.pms.exception.ResourceNotFoundException;
import com.alx.pms.model.Project;
import com.alx.pms.model.Role;
import com.alx.pms.model.TaskStatus;
import com.alx.pms.model.User;
import com.alx.pms.project.dto.ProjectResponse;
import com.alx.pms.task.dto.TaskRequest;
import com.alx.pms.task.dto.TaskResponse;
import com.alx.pms.task.service.TaskService;
import com.alx.pms.user.dto.UserResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TaskController.class)
@ActiveProfiles("test")
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TaskService taskService;

    @Autowired
    private ObjectMapper objectMapper;

    private User currentUser;
    private Long projectId = 10L;
    private Long taskId = 100L;
    private TaskRequest taskRequest;
    private TaskResponse taskResponse;

    @BeforeEach
    void setUp() {
        currentUser = new User();
        currentUser.setId(1L);
        currentUser.setUsername("testuser");
        currentUser.setRoles(Set.of(Role.ROLE_USER));

        User assignedUser = new User();
        assignedUser.setId(2L);
        assignedUser.setUsername("assignedUser");

        ProjectResponse projectResponse = new ProjectResponse();
        projectResponse.setId(projectId);
        projectResponse.setName("Test Project");

        UserResponse currentUserResponse = new UserResponse();
        currentUserResponse.setId(currentUser.getId());
        currentUserResponse.setUsername(currentUser.getUsername());

        UserResponse assignedUserResponse = new UserResponse();
        assignedUserResponse.setId(assignedUser.getId());
        assignedUserResponse.setUsername(assignedUser.getUsername());

        taskRequest = new TaskRequest();
        taskRequest.setTitle("New Task");
        taskRequest.setDescription("Description for new task");
        taskRequest.setAssignedToUserId(assignedUser.getId());
        taskRequest.setStatus(TaskStatus.TO_DO);
        taskRequest.setDueDate(LocalDate.now().plusWeeks(1));

        taskResponse = new TaskResponse();
        taskResponse.setId(taskId);
        taskResponse.setTitle(taskRequest.getTitle());
        taskResponse.setDescription(taskRequest.getDescription());
        taskResponse.setProject(projectResponse);
        taskResponse.setAssignedTo(assignedUserResponse);
        taskResponse.setStatus(taskRequest.getStatus());
        taskResponse.setDueDate(taskRequest.getDueDate());
        taskResponse.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("POST /api/v1/projects/{projectId}/tasks - Should create a new task successfully")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void createTask_Success() throws Exception {
        when(taskService.createTask(eq(projectId), any(TaskRequest.class), eq(currentUser.getId()))).thenReturn(taskResponse);

        mockMvc.perform(post("/api/v1/projects/{projectId}/tasks", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest))
                        .principal(currentUser))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(taskResponse.getId()))
                .andExpect(jsonPath("$.title").value(taskResponse.getTitle()));

        verify(taskService, times(1)).createTask(eq(projectId), any(TaskRequest.class), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("POST /api/v1/projects/{projectId}/tasks - Should return 403 Forbidden if not project owner")
    @WithMockUser(username = "otheruser", roles = {"USER"})
    void createTask_NotProjectOwner_Forbidden() throws Exception {
        User otherUser = new User();
        otherUser.setId(99L);
        otherUser.setUsername("otheruser");

        when(taskService.createTask(eq(projectId), any(TaskRequest.class), eq(otherUser.getId())))
                .thenThrow(new ForbiddenException("You are not authorized to access tasks in this project."));

        mockMvc.perform(post("/api/v1/projects/{projectId}/tasks", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest))
                        .principal(otherUser))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not authorized to access tasks in this project."));

        verify(taskService, times(1)).createTask(eq(projectId), any(TaskRequest.class), eq(otherUser.getId()));
    }

    @Test
    @DisplayName("GET /api/v1/projects/{projectId}/tasks/{taskId} - Should get task by ID successfully")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getTaskById_Success() throws Exception {
        when(taskService.getTaskById(eq(taskId), eq(currentUser.getId()))).thenReturn(taskResponse);

        mockMvc.perform(get("/api/v1/projects/{projectId}/tasks/{taskId}", projectId, taskId)
                        .principal(currentUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskResponse.getId()))
                .andExpect(jsonPath("$.title").value(taskResponse.getTitle()));

        verify(taskService, times(1)).getTaskById(eq(taskId), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("GET /api/v1/projects/{projectId}/tasks/{taskId} - Should return 404 Not Found")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getTaskById_NotFound() throws Exception {
        when(taskService.getTaskById(eq(999L), eq(currentUser.getId())))
                .thenThrow(new ResourceNotFoundException("Task not found with ID: 999"));

        mockMvc.perform(get("/api/v1/projects/{projectId}/tasks/{taskId}", projectId, 999L)
                        .principal(currentUser))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Task not found with ID: 999"));

        verify(taskService, times(1)).getTaskById(eq(999L), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("GET /api/v1/projects/{projectId}/tasks - Should get all tasks for a project successfully")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getTasksByProjectId_Success() throws Exception {
        when(taskService.getTasksByProjectId(eq(projectId), eq(currentUser.getId()))).thenReturn(List.of(taskResponse));

        mockMvc.perform(get("/api/v1/projects/{projectId}/tasks", projectId)
                        .principal(currentUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(taskResponse.getId()))
                .andExpect(jsonPath("$[0].title").value(taskResponse.getTitle()));

        verify(taskService, times(1)).getTasksByProjectId(eq(projectId), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("GET /api/v1/projects/{projectId}/tasks/assigned-to-me - Should get tasks assigned to current user")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void getTasksAssignedToCurrentUser_Success() throws Exception {
        when(taskService.getTasksAssignedToUser(eq(currentUser.getId()), eq(currentUser.getId()))).thenReturn(List.of(taskResponse));

        mockMvc.perform(get("/api/v1/projects/{projectId}/tasks/assigned-to-me", projectId)
                        .principal(currentUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(taskResponse.getId()))
                .andExpect(jsonPath("$[0].title").value(taskResponse.getTitle()));

        verify(taskService, times(1)).getTasksAssignedToUser(eq(currentUser.getId()), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("PUT /api/v1/projects/{projectId}/tasks/{taskId} - Should update a task successfully")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void updateTask_Success() throws Exception {
        TaskRequest updateRequest = new TaskRequest();
        updateRequest.setTitle("Updated Task Title");
        updateRequest.setStatus(TaskStatus.IN_PROGRESS);

        TaskResponse updatedResponse = new TaskResponse();
        updatedResponse.setId(taskId);
        updatedResponse.setTitle(updateRequest.getTitle());
        updatedResponse.setStatus(updateRequest.getStatus());
        updatedResponse.setProject(taskResponse.getProject()); // Keep project info

        when(taskService.updateTask(eq(taskId), any(TaskRequest.class), eq(currentUser.getId()))).thenReturn(updatedResponse);

        mockMvc.perform(put("/api/v1/projects/{projectId}/tasks/{taskId}", projectId, taskId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest))
                        .principal(currentUser))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(updatedResponse.getId()))
                .andExpect(jsonPath("$.title").value(updatedResponse.getTitle()))
                .andExpect(jsonPath("$.status").value(updatedResponse.getStatus().name()));

        verify(taskService, times(1)).updateTask(eq(taskId), any(TaskRequest.class), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("DELETE /api/v1/projects/{projectId}/tasks/{taskId} - Should delete a task successfully")
    @WithMockUser(username = "testuser", roles = {"USER"})
    void deleteTask_Success() throws Exception {
        doNothing().when(taskService).deleteTask(eq(taskId), eq(currentUser.getId()));

        mockMvc.perform(delete("/api/v1/projects/{projectId}/tasks/{taskId}", projectId, taskId)
                        .principal(currentUser))
                .andExpect(status().isNoContent());

        verify(taskService, times(1)).deleteTask(eq(taskId), eq(currentUser.getId()));
    }

    @Test
    @DisplayName("DELETE /api/v1/projects/{projectId}/tasks/{taskId} - Should return 403 Forbidden if not project owner")
    @WithMockUser(username = "otheruser", roles = {"USER"})
    void deleteTask_NotProjectOwner_Forbidden() throws Exception {
        User otherUser = new User();
        otherUser.setId(99L);
        otherUser.setUsername("otheruser");

        doThrow(new ForbiddenException("You are not authorized to delete this task."))
                .when(taskService).deleteTask(eq(taskId), eq(otherUser.getId()));

        mockMvc.perform(delete("/api/v1/projects/{projectId}/tasks/{taskId}", projectId, taskId)
                        .principal(otherUser))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not authorized to delete this task."));

        verify(taskService, times(1)).deleteTask(eq(taskId), eq(otherUser.getId()));
    }

    @Test
    @DisplayName("Unauthorized access to create task should return 401")
    void createTask_Unauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/projects/{projectId}/tasks", projectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(taskService);
    }
}
```
```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.config.JwtAuthFilter;
import com.alx.taskmgr.config.RateLimitInterceptor;
import com.alx.taskmgr.dto.category.CategoryResponse;
import com.alx.taskmgr.dto.task.TaskRequest;
import com.alx.taskmgr.dto.task.TaskResponse;
import com.alx.taskmgr.dto.user.UserResponse;
import com.alx.taskmgr.entity.Role;
import com.alx.taskmgr.entity.TaskStatus;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.exception.UnauthorizedException;
import com.alx.taskmgr.service.TaskService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * API (Controller) tests for {@link TaskController} using Spring MockMvc.
 * Focuses on testing the HTTP endpoints for task management, including authorization.
 * Uses {@link WebMvcTest} to load web-related components, excluding JWT filter for simplicity
 * as we are using {@link WithMockUser} for authentication context.
 */
@WebMvcTest(controllers = TaskController.class,
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.ASSIGNABLE_TYPE,
                classes = {JwtAuthFilter.class, RateLimitInterceptor.class}))
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private ObjectMapper objectMapper;

    @MockBean
    private TaskService taskService; // Mock the service layer

    private UserResponse testUserResponse;
    private CategoryResponse testCategoryResponse;
    private TaskRequest taskRequest;
    private TaskResponse taskResponse;

    @BeforeEach
    void setUp() {
        // Configure ObjectMapper to handle LocalDateTime
        objectMapper = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .build();

        testUserResponse = UserResponse.builder()
                .id(1L)
                .fullName("Test User")
                .email("user@example.com")
                .roles(Set.of(Role.ROLE_USER))
                .build();

        testCategoryResponse = CategoryResponse.builder()
                .id(10L)
                .name("Work")
                .build();

        taskRequest = TaskRequest.builder()
                .title("New Task")
                .description("Task Description")
                .dueDate(LocalDateTime.now().plusDays(5))
                .status(TaskStatus.PENDING)
                .categoryId(testCategoryResponse.getId())
                .build();

        taskResponse = TaskResponse.builder()
                .id(100L)
                .title("New Task")
                .description("Task Description")
                .dueDate(LocalDateTime.now().plusDays(5))
                .status(TaskStatus.PENDING)
                .owner(testUserResponse)
                .category(testCategoryResponse)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should create a new task and return 201 Created")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void createTask_Success_Returns201() throws Exception {
        // Given
        when(taskService.createTask(any(TaskRequest.class), anyString())).thenReturn(taskResponse);

        // When & Then
        mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(taskResponse.getId()))
                .andExpect(jsonPath("$.title").value(taskResponse.getTitle()))
                .andExpect(jsonPath("$.owner.email").value(testUserResponse.getEmail()));
    }

    @Test
    @DisplayName("Should return 400 Bad Request for invalid task creation input")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void createTask_InvalidInput_Returns400() throws Exception {
        // Given
        taskRequest.setTitle(""); // Invalid title
        taskRequest.setCategoryId(null); // Invalid category

        // When & Then
        mockMvc.perform(post("/api/v1/tasks")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(taskRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.title").value("Title cannot be empty"))
                .andExpect(jsonPath("$.errors.categoryId").value("Category ID cannot be null"));
    }

    @Test
    @DisplayName("Should retrieve all tasks for authenticated user and return 200 OK")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void getAllTasks_User_Success_Returns200() throws Exception {
        // Given
        when(taskService.getAllTasksForUser(anyString())).thenReturn(List.of(taskResponse));

        // When & Then
        mockMvc.perform(get("/api/v1/tasks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(taskResponse.getId()))
                .andExpect(jsonPath("$[0].title").value(taskResponse.getTitle()));
    }

    @Test
    @DisplayName("Should retrieve all tasks for a specific owner by Admin and return 200 OK")
    @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
    void getAllTasks_AdminWithOwnerId_Success_Returns200() throws Exception {
        // Given
        when(taskService.getAllTasksByOwnerId(anyLong())).thenReturn(List.of(taskResponse));

        // When & Then
        mockMvc.perform(get("/api/v1/tasks").param("ownerId", testUserResponse.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(taskResponse.getId()))
                .andExpect(jsonPath("$[0].owner.id").value(testUserResponse.getId()));
    }

    @Test
    @DisplayName("Should forbid non-admin user from requesting tasks for another ownerId")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void getAllTasks_UserWithOwnerId_Returns403() throws Exception {
        // When & Then
        mockMvc.perform(get("/api/v1/tasks").param("ownerId", testUserResponse.getId().toString()))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should retrieve a task by ID for owner and return 200 OK")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void getTaskById_Owner_Success_Returns200() throws Exception {
        // Given
        when(taskService.getTaskById(anyLong(), anyString(), anyCollection())).thenReturn(taskResponse);

        // When & Then
        mockMvc.perform(get("/api/v1/tasks/{id}", taskResponse.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(taskResponse.getId()))
                .andExpect(jsonPath("$.title").value(taskResponse.getTitle()));
    }

    @Test
    @DisplayName("Should return 404 Not Found when getting non-existent task")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void getTaskById_NotFound_Returns404() throws Exception {
        // Given
        when(taskService.getTaskById(anyLong(), anyString(), anyCollection()))
                .thenThrow(new ResourceNotFoundException("Task not found with ID: 999"));

        // When & Then
        mockMvc.perform(get("/api/v1/tasks/{id}", 999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Task not found with ID: 999"));
    }

    @Test
    @DisplayName("Should return 403 Forbidden when non-owner/non-admin tries to get task")
    @WithMockUser(username = "another@example.com", roles = {"USER"})
    void getTaskById_Unauthorized_Returns403() throws Exception {
        // Given
        when(taskService.getTaskById(anyLong(), anyString(), anyCollection()))
                .thenThrow(new UnauthorizedException("You are not authorized to view this task."));

        // When & Then
        mockMvc.perform(get("/api/v1/tasks/{id}", taskResponse.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not authorized to view this task."));
    }

    @Test
    @DisplayName("Should update an existing task by owner and return 200 OK")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void updateTask_Owner_Success_Returns200() throws Exception {
        // Given
        TaskRequest updateRequest = taskRequest.toBuilder().title("Updated Task").status(TaskStatus.COMPLETED).build();
        TaskResponse updatedResponse = taskResponse.toBuilder().title("Updated Task").status(TaskStatus.COMPLETED).build();
        when(taskService.updateTask(anyLong(), any(TaskRequest.class), anyString(), anyCollection())).thenReturn(updatedResponse);

        // When & Then
        mockMvc.perform(put("/api/v1/tasks/{id}", taskResponse.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(updatedResponse.getId()))
                .andExpect(jsonPath("$.title").value(updatedResponse.getTitle()))
                .andExpect(jsonPath("$.status").value(updatedResponse.getStatus().name()));
    }

    @Test
    @DisplayName("Should delete a task by owner and return 204 No Content")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void deleteTask_Owner_Success_Returns204() throws Exception {
        // Given
        doNothing().when(taskService).deleteTask(anyLong(), anyString(), anyCollection());

        // When & Then
        mockMvc.perform(delete("/api/v1/tasks/{id}", taskResponse.getId()))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Should return 403 Forbidden when non-owner/non-admin tries to delete task")
    @WithMockUser(username = "another@example.com", roles = {"USER"})
    void deleteTask_Unauthorized_Returns403() throws Exception {
        // Given
        doThrow(new UnauthorizedException("You are not authorized to delete this task."))
                .when(taskService).deleteTask(anyLong(), anyString(), anyCollection());

        // When & Then
        mockMvc.perform(delete("/api/v1/tasks/{id}", taskResponse.getId()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("You are not authorized to delete this task."));
    }

    @Test
    @DisplayName("Should return 404 Not Found when deleting non-existent task")
    @WithMockUser(username = "user@example.com", roles = {"USER"})
    void deleteTask_NotFound_Returns404() throws Exception {
        // Given
        doThrow(new ResourceNotFoundException("Task not found with ID: 999"))
                .when(taskService).deleteTask(anyLong(), anyString(), anyCollection());

        // When & Then
        mockMvc.perform(delete("/api/v1/tasks/{id}", 999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Task not found with ID: 999"));
    }
}
```
```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.AuthRequest;
import com.alx.taskmgr.dto.AuthResponse;
import com.alx.taskmgr.dto.CategoryDTO;
import com.alx.taskmgr.dto.TaskDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev") // Uses H2 in-memory db
@Transactional // Rollback transactions after each test
@DisplayName("TaskController Integration Tests")
public class TaskControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String jwtToken;
    private Long userId;

    @BeforeEach
    void setUp() throws Exception {
        objectMapper.registerModule(new JavaTimeModule()); // Register JavaTimeModule for LocalDate

        // Register a new user
        AuthRequest registerRequest = AuthRequest.builder()
                .username("integrationuser")
                .email("integration@example.com")
                .password("password123")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        // Login the user to get JWT token
        AuthRequest loginRequest = AuthRequest.builder()
                .username("integrationuser")
                .password("password123")
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String responseJson = result.getResponse().getContentAsString();
        AuthResponse authResponse = objectMapper.readValue(responseJson, AuthResponse.class);
        jwtToken = authResponse.getToken();
        userId = authResponse.getId();
    }

    private String createAuthorizationHeader(String token) {
        return "Bearer " + token;
    }

    private CategoryDTO createCategory(String name, String description) throws Exception {
        CategoryDTO newCategory = CategoryDTO.builder()
                .name(name)
                .description(description)
                .build();

        MvcResult result = mockMvc.perform(post("/api/categories")
                        .header("Authorization", createAuthorizationHeader(jwtToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCategory)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readValue(result.getResponse().getContentAsString(), CategoryDTO.class);
    }


    @Test
    @DisplayName("Should create a new task successfully")
    void shouldCreateTaskSuccessfully() throws Exception {
        CategoryDTO category = createCategory("Work", "Work related tasks");

        TaskDTO newTask = TaskDTO.builder()
                .title("Buy groceries")
                .description("Milk, Eggs, Bread")
                .dueDate(LocalDate.now().plusDays(1))
                .completed(false)
                .categoryId(category.getId())
                .build();

        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", createAuthorizationHeader(jwtToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newTask)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Buy groceries"))
                .andExpect(jsonPath("$.description").value("Milk, Eggs, Bread"))
                .andExpect(jsonPath("$.completed").value(false))
                .andExpect(jsonPath("$.categoryName").value("Work"))
                .andExpect(jsonPath("$.userId").value(userId));
    }

    @Test
    @DisplayName("Should get all tasks for the current user")
    void shouldGetAllTasksForCurrentUser() throws Exception {
        createTask("Task 1", "Desc 1", null, false);
        createTask("Task 2", "Desc 2", null, true);

        mockMvc.perform(get("/api/tasks")
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Task 1"))
                .andExpect(jsonPath("$[1].title").value("Task 2"));
    }

    @Test
    @DisplayName("Should get a task by ID for the current user")
    void shouldGetTaskById() throws Exception {
        TaskDTO createdTask = createTask("Single Task", "Description", null, false);

        mockMvc.perform(get("/api/tasks/{id}", createdTask.getId())
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Single Task"))
                .andExpect(jsonPath("$.id").value(createdTask.getId()));
    }

    @Test
    @DisplayName("Should return 404 for non-existent task ID")
    void shouldReturnNotFoundForNonExistentTaskId() throws Exception {
        mockMvc.perform(get("/api/tasks/{id}", 999L)
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should update an existing task")
    void shouldUpdateExistingTask() throws Exception {
        TaskDTO createdTask = createTask("Old Title", "Old Desc", LocalDate.now(), false);

        TaskDTO updatedTask = TaskDTO.builder()
                .title("New Title")
                .description("New Description")
                .dueDate(LocalDate.now().plusDays(2))
                .completed(true)
                .build();

        mockMvc.perform(put("/api/tasks/{id}", createdTask.getId())
                        .header("Authorization", createAuthorizationHeader(jwtToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedTask)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("New Title"))
                .andExpect(jsonPath("$.description").value("New Description"))
                .andExpect(jsonPath("$.completed").value(true));
    }

    @Test
    @DisplayName("Should delete a task")
    void shouldDeleteTask() throws Exception {
        TaskDTO createdTask = createTask("Task to Delete", "Desc", null, false);

        mockMvc.perform(delete("/api/tasks/{id}", createdTask.getId())
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/tasks/{id}", createdTask.getId())
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isNotFound()); // Verify it's gone
    }

    @Test
    @DisplayName("Should mark a task as complete")
    void shouldMarkTaskAsComplete() throws Exception {
        TaskDTO createdTask = createTask("Incomplete Task", "Desc", null, false);

        mockMvc.perform(put("/api/tasks/{id}/complete", createdTask.getId())
                        .param("completed", "true")
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completed").value(true));
    }

    @Test
    @DisplayName("Should filter tasks by completion status")
    void shouldFilterTasksByCompletionStatus() throws Exception {
        createTask("Complete A", "", null, true);
        createTask("Incomplete B", "", null, false);
        createTask("Complete C", "", null, true);

        mockMvc.perform(get("/api/tasks")
                        .param("completed", "true")
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Complete A"))
                .andExpect(jsonPath("$[1].title").value("Complete C"));

        mockMvc.perform(get("/api/tasks")
                        .param("completed", "false")
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Incomplete B"));
    }

    @Test
    @DisplayName("Should filter tasks by category")
    void shouldFilterTasksByCategory() throws Exception {
        CategoryDTO workCategory = createCategory("Work", "Work tasks");
        CategoryDTO personalCategory = createCategory("Personal", "Personal tasks");

        createTask("Work Task 1", "", null, false, workCategory.getId());
        createTask("Personal Task 1", "", null, false, personalCategory.getId());
        createTask("Work Task 2", "", null, false, workCategory.getId());

        mockMvc.perform(get("/api/tasks")
                        .param("categoryId", String.valueOf(workCategory.getId()))
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].title").value("Work Task 1"))
                .andExpect(jsonPath("$[1].title").value("Work Task 2"));

        mockMvc.perform(get("/api/tasks")
                        .param("categoryId", String.valueOf(personalCategory.getId()))
                        .header("Authorization", createAuthorizationHeader(jwtToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Personal Task 1"));
    }


    // Helper method to create a task for testing
    private TaskDTO createTask(String title, String description, LocalDate dueDate, boolean completed) throws Exception {
        return createTask(title, description, dueDate, completed, null);
    }

    private TaskDTO createTask(String title, String description, LocalDate dueDate, boolean completed, Long categoryId) throws Exception {
        TaskDTO task = TaskDTO.builder()
                .title(title)
                .description(description)
                .dueDate(dueDate)
                .completed(completed)
                .categoryId(categoryId)
                .build();

        MvcResult result = mockMvc.perform(post("/api/tasks")
                        .header("Authorization", createAuthorizationHeader(jwtToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(task)))
                .andExpect(status().isCreated())
                .andReturn();

        return objectMapper.readValue(result.getResponse().getContentAsString(), TaskDTO.class);
    }
}
```
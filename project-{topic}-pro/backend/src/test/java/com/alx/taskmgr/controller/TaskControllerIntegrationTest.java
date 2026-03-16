package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.auth.LoginRequest;
import com.alx.taskmgr.dto.task.TaskCreateRequest;
import com.alx.taskmgr.dto.task.TaskResponse;
import com.alx.taskmgr.dto.task.TaskUpdateRequest;
import com.alx.taskmgr.entity.Project;
import com.alx.taskmgr.entity.Role;
import com.alx.taskmgr.entity.Task;
import com.alx.taskmgr.entity.User;
import com.alx.taskmgr.entity.enums.TaskStatus;
import com.alx.taskmgr.repository.ProjectRepository;
import com.alx.taskmgr.repository.RoleRepository;
import com.alx.taskmgr.repository.TaskRepository;
import com.alx.taskmgr.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.Set;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for TaskController using Testcontainers for a real PostgreSQL database.
 * - @SpringBootTest: Loads the full application context.
 * - @AutoConfigureMockMvc: Configures MockMvc for testing controllers.
 * - @Testcontainers: Enables JUnit 5 Testcontainers integration.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class TaskControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true"); // Ensure Flyway runs for tests
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository; // Assuming you have a RoleRepository
    @Autowired
    private ProjectRepository projectRepository;
    @Autowired
    private TaskRepository taskRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private String userToken;
    private User testUser;
    private Project testProject;

    @BeforeEach
    void setUp() throws Exception {
        // Clear all repositories before each test
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll(); // Ensure roles are clean or re-inserted

        // Setup roles
        Role userRole = new Role();
        userRole.setName("ROLE_USER");
        roleRepository.save(userRole);

        Role adminRole = new Role();
        adminRole.setName("ROLE_ADMIN");
        roleRepository.save(adminRole);

        // Setup a test user
        testUser = new User();
        testUser.setUsername("inttestuser");
        testUser.setEmail("inttestuser@example.com");
        testUser.setPassword(passwordEncoder.encode("password123"));
        testUser.setRoles(Set.of(userRole));
        userRepository.save(testUser);

        // Authenticate the test user to get a JWT token
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("inttestuser");
        loginRequest.setPassword("password123");

        String authResponseString = mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        userToken = objectMapper.readTree(authResponseString).get("token").asText();

        // Setup a test project for the user
        testProject = new Project();
        testProject.setName("Integration Test Project");
        testProject.setDescription("Project for integration testing tasks");
        testProject.setOwner(testUser);
        testProject.setCollaborators(Set.of(testUser));
        projectRepository.save(testProject);
    }

    @AfterEach
    void tearDown() {
        taskRepository.deleteAll();
        projectRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();
    }

    @Test
    @DisplayName("Should create a new task successfully")
    void shouldCreateNewTask() throws Exception {
        TaskCreateRequest createRequest = new TaskCreateRequest();
        createRequest.setTitle("New API Task");
        createRequest.setDescription("Description for new API task");
        createRequest.setProjectId(testProject.getId());
        createRequest.setAssignedToId(testUser.getId());
        createRequest.setDueDate(LocalDateTime.now().plusDays(10));

        mockMvc.perform(post("/api/tasks")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title", is("New API Task")))
                .andExpect(jsonPath("$.projectId", is(testProject.getId().intValue())))
                .andExpect(jsonPath("$.assignedTo.id", is(testUser.getId().intValue())))
                .andExpect(jsonPath("$.status", is(TaskStatus.OPEN.name())));
    }

    @Test
    @DisplayName("Should get task by ID")
    void shouldGetTaskById() throws Exception {
        Task task = new Task();
        task.setTitle("Find Me Task");
        task.setDescription("Description");
        task.setStatus(TaskStatus.OPEN);
        task.setProject(testProject);
        task.setAssignedTo(testUser);
        taskRepository.save(task);

        mockMvc.perform(get("/api/tasks/{id}", task.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(task.getId().intValue())))
                .andExpect(jsonPath("$.title", is("Find Me Task")));
    }

    @Test
    @DisplayName("Should get tasks by project ID")
    void shouldGetTasksByProjectId() throws Exception {
        Task task1 = new Task();
        task1.setTitle("Project Task 1");
        task1.setProject(testProject);
        task1.setStatus(TaskStatus.OPEN);
        task1.setAssignedTo(testUser);
        taskRepository.save(task1);

        Task task2 = new Task();
        task2.setTitle("Project Task 2");
        task2.setProject(testProject);
        task2.setStatus(TaskStatus.IN_PROGRESS);
        task2.setAssignedTo(testUser);
        taskRepository.save(task2);

        mockMvc.perform(get("/api/tasks/project/{projectId}", testProject.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].projectId", is(testProject.getId().intValue())))
                .andExpect(jsonPath("$[1].projectId", is(testProject.getId().intValue())));
    }

    @Test
    @DisplayName("Should update an existing task")
    void shouldUpdateTask() throws Exception {
        Task task = new Task();
        task.setTitle("Old Title");
        task.setDescription("Old Description");
        task.setStatus(TaskStatus.OPEN);
        task.setProject(testProject);
        task.setAssignedTo(testUser);
        taskRepository.save(task);

        TaskUpdateRequest updateRequest = new TaskUpdateRequest();
        updateRequest.setTitle("Updated Title");
        updateRequest.setDescription("Updated Description");
        updateRequest.setStatus(TaskStatus.COMPLETED);

        mockMvc.perform(put("/api/tasks/{id}", task.getId())
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Updated Title")))
                .andExpect(jsonPath("$.description", is("Updated Description")))
                .andExpect(jsonPath("$.status", is(TaskStatus.COMPLETED.name())));
    }

    @Test
    @DisplayName("Should delete a task")
    void shouldDeleteTask() throws Exception {
        Task task = new Task();
        task.setTitle("Task to Delete");
        task.setProject(testProject);
        task.setAssignedTo(testUser);
        task.setStatus(TaskStatus.OPEN);
        taskRepository.save(task);

        mockMvc.perform(delete("/api/tasks/{id}", task.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/tasks/{id}", task.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound()); // Verify it's gone
    }

    @Test
    @DisplayName("Should return 404 for non-existent task on GET")
    void shouldReturn404ForNonExistentTaskOnGet() throws Exception {
        mockMvc.perform(get("/api/tasks/{id}", 9999L)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should return 403 when trying to delete another user's project task (not owner)")
    void shouldReturn403WhenDeletingAnotherUsersProjectTask() throws Exception {
        // Create another user
        User otherUser = new User();
        otherUser.setUsername("otheruser");
        otherUser.setEmail("other@example.com");
        otherUser.setPassword(passwordEncoder.encode("password123"));
        otherUser.setRoles(Set.of(roleRepository.findByName("ROLE_USER").orElseThrow()));
        userRepository.save(otherUser);

        // Create a project owned by other user
        Project otherUserProject = new Project();
        otherUserProject.setName("Other User's Project");
        otherUserProject.setOwner(otherUser);
        otherUserProject.setCollaborators(Set.of(otherUser));
        projectRepository.save(otherUserProject);

        // Create a task in other user's project
        Task otherUserTask = new Task();
        otherUserTask.setTitle("Other User's Task");
        otherUserTask.setProject(otherUserProject);
        otherUserTask.setAssignedTo(otherUser);
        otherUserTask.setStatus(TaskStatus.OPEN);
        taskRepository.save(otherUserTask);

        // Current 'testUser' tries to delete 'otherUserTask'
        mockMvc.perform(delete("/api/tasks/{id}", otherUserTask.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }
}
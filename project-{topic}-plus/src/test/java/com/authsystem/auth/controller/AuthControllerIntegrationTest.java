package com.authsystem.auth.controller;

import com.authsystem.SecureAuthSystemApplication;
import com.authsystem.auth.dto.AuthRequest;
import com.authsystem.auth.dto.RegisterRequest;
import com.authsystem.auth.service.AuthService;
import com.authsystem.repository.RoleRepository;
import com.authsystem.repository.UserRepository;
import com.authsystem.testcontainers.PostgreSQLTestContainerExtension;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link AuthController}.
 * These tests spin up a full Spring Boot application context and use Testcontainers
 * to interact with a real PostgreSQL database, ensuring that all layers (controller,
 * service, repository, database) work together correctly.
 *
 * {@code @SpringBootTest} loads the entire application context.
 * {@code @AutoConfigureMockMvc} configures MockMvc for testing REST controllers without
 * actually starting an HTTP server.
 * {@code @ActiveProfiles("test")} uses a dedicated test profile for database configuration.
 * {@code @Testcontainers} and {@code @Container} set up and manage the PostgreSQL container.
 */
@SpringBootTest(classes = SecureAuthSystemApplication.class, webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test") // Use application-test.yml for DB setup via Testcontainers
@Testcontainers
@ExtendWith(PostgreSQLTestContainerExtension.class) // Custom extension to manage Testcontainers lifecycle
@DisplayName("AuthController Integration Tests")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private WebApplicationContext webApplicationContext; // To reset MockMvc builder if needed after Testcontainers

    // PostgreSQL container managed by the extension
    @Container
    public static PostgreSQLContainer<?> postgreSQLContainer = PostgreSQLTestContainerExtension.getContainer();

    /**
     * Dynamically sets Spring Boot properties to connect to the Testcontainers PostgreSQL instance.
     * This method runs once before any tests in this class.
     *
     * @param registry The {@link DynamicPropertyRegistry} to add/override properties.
     */
    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgreSQLContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgreSQLContainer::getUsername);
        registry.add("spring.datasource.password", postgreSQLContainer::getPassword);
        registry.add("spring.flyway.enabled", () -> true); // Ensure Flyway runs for integration tests
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate"); // Validate schema with Flyway
    }

    @BeforeEach
    void setUp() {
        // Clear data between tests to ensure test isolation
        userRepository.deleteAll();
        roleRepository.deleteAll();
        // Flyway will re-seed data if configured in the test profile, or we can manually seed.
        // For simplicity, we can rely on V2__seed_data.sql running via Flyway during context startup.
        // If specific test data is needed, it should be inserted here directly or via a test fixture.
        mockMvc = MockMvcBuilders.webAppContextSetup(webApplicationContext).build(); // Rebuild MockMvc to reflect any context changes
    }

    // --- Register Endpoint Tests ---
    @Test
    void register_shouldRegisterNewUserAndReturnToken_whenValidDetails() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .username("newuser_valid")
                .email("newuser_valid@example.com")
                .password("SecurePass1!")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value(201))
                .andExpect(jsonPath("$.message").value("User registered successfully"))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void register_shouldReturnBadRequest_whenUsernameAlreadyExists() throws Exception {
        // First register a user
        RegisterRequest initialRequest = RegisterRequest.builder()
                .username("existing_user")
                .email("existing@example.com")
                .password("SecurePass1!")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(initialRequest)))
                .andExpect(status().isCreated());

        // Then try to register with the same username
        RegisterRequest duplicateRequest = RegisterRequest.builder()
                .username("existing_user") // Duplicate username
                .email("another@example.com")
                .password("SecurePass1!")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Username 'existing_user' is already taken."))
                .andExpect(jsonPath("$.errorCode").value("username_taken"));
    }

    @Test
    void register_shouldReturnBadRequest_whenInvalidPassword() throws Exception {
        RegisterRequest request = RegisterRequest.builder()
                .username("invalidpassuser")
                .email("invalidpass@example.com")
                .password("weak") // Invalid password
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.password").isString());
    }

    // --- Login Endpoint Tests ---
    @Test
    void login_shouldAuthenticateAndReturnToken_whenValidCredentials() throws Exception {
        // Register a user first to have valid credentials
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("loginuser_valid")
                .email("loginuser_valid@example.com")
                .password("LoginPass1!")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        AuthRequest authRequest = AuthRequest.builder()
                .username("loginuser_valid")
                .password("LoginPass1!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(200))
                .andExpect(jsonPath("$.message").value("Login successful. Welcome back!"))
                .andExpect(jsonPath("$.data.token").isString())
                .andExpect(jsonPath("$.data.token").isNotEmpty());
    }

    @Test
    void login_shouldReturnUnauthorized_whenInvalidCredentials() throws Exception {
        AuthRequest authRequest = AuthRequest.builder()
                .username("nonexistent_user")
                .password("WrongPass1!")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password"))
                .andExpect(jsonPath("$.errorCode").value("bad_credentials"));
    }

    @Test
    void login_shouldReturnUnauthorized_whenIncorrectPassword() throws Exception {
        // Register a user
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("user_for_wrong_pass")
                .email("user_for_wrong_pass@example.com")
                .password("CorrectPass1!")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        AuthRequest authRequest = AuthRequest.builder()
                .username("user_for_wrong_pass")
                .password("WrongPassword!") // Incorrect password
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid username or password"))
                .andExpect(jsonPath("$.errorCode").value("bad_credentials"));
    }

    // Helper for Testcontainers extension
    static class PostgreSQLTestContainerExtension implements org.junit.jupiter.api.extension.BeforeAllCallback, org.junit.jupiter.api.extension.AfterAllCallback {
        private static PostgreSQLContainer<?> postgreSQLContainer;

        @Override
        public void beforeAll(org.junit.jupiter.api.extension.ExtensionContext context) {
            postgreSQLContainer = new PostgreSQLContainer<>("postgres:15-alpine")
                    .withDatabaseName("test_auth_db")
                    .withUsername("testuser")
                    .withPassword("testpass")
                    .withInitScript("db/migration/V1__initial_schema.sql") // Run initial schema script
                    .withInitScript("db/migration/V2__seed_data.sql"); // Run seed data script
            postgreSQLContainer.start();
        }

        @Override
        public void afterAll(org.junit.jupiter.api.extension.ExtensionContext context) {
            if (postgreSQLContainer != null) {
                postgreSQLContainer.stop();
            }
        }

        public static PostgreSQLContainer<?> getContainer() {
            return postgreSQLContainer;
        }
    }
}
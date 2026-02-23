package com.alx.taskmanager.controller;

import com.alx.taskmanager.dto.JwtResponse;
import com.alx.taskmanager.dto.LoginRequest;
import com.alx.taskmanager.dto.RegisterRequest;
import com.alx.taskmanager.model.Role;
import com.alx.taskmanager.model.User;
import com.alx.taskmanager.model.UserRole;
import com.alx.taskmanager.repository.RoleRepository;
import com.alx.taskmanager.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public class AuthControllerIntegrationTest {

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
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure schema is created for tests
        registry.add("spring.flyway.enabled", () -> "false"); // Disable Flyway for test setup
    }

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String getBaseUrl() {
        return "http://localhost:" + port + "/api/auth";
    }

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
        roleRepository.deleteAll();

        // Ensure roles exist for tests
        roleRepository.save(new Role(null, UserRole.ROLE_USER));
        roleRepository.save(new Role(null, UserRole.ROLE_ADMIN));
    }

    @Test
    void registerUser_ValidRequest_ReturnsOk() {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setPassword("newpassword");
        registerRequest.setRoles(Collections.singleton("user"));

        ResponseEntity<String> response = restTemplate.postForEntity(getBaseUrl() + "/register", registerRequest, String.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("User registered successfully!", response.getBody());
        assertTrue(userRepository.existsByUsername("newuser"));
    }

    @Test
    void registerUser_DuplicateUsername_ReturnsBadRequest() {
        // First registration
        registerUser_ValidRequest_ReturnsOk();

        // Second registration with same username
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("another@example.com");
        registerRequest.setPassword("anotherpassword");

        ResponseEntity<String> response = restTemplate.postForEntity(getBaseUrl() + "/register", registerRequest, String.class);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().contains("Username is already taken!"));
    }

    @Test
    void login_ValidCredentials_ReturnsJwtResponse() {
        // Register a user first
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("loginuser");
        registerRequest.setEmail("login@example.com");
        registerRequest.setPassword("loginpassword");
        restTemplate.postForEntity(getBaseUrl() + "/register", registerRequest, String.class);

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("loginuser");
        loginRequest.setPassword("loginpassword");

        ResponseEntity<JwtResponse> response = restTemplate.postForEntity(getBaseUrl() + "/login", loginRequest, JwtResponse.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody().getToken());
        assertEquals("loginuser", response.getBody().getUsername());
        assertTrue(response.getBody().getRoles().contains("ROLE_USER"));
    }

    @Test
    void login_InvalidCredentials_ReturnsUnauthorized() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setUsername("nonexistent");
        loginRequest.setPassword("wrongpassword");

        ResponseEntity<JwtResponse> response = restTemplate.postForEntity(getBaseUrl() + "/login", loginRequest, JwtResponse.class);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
    }
}
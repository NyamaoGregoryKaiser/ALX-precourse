package com.mlutil.ml_utilities_system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mlutil.ml_utilities_system.dto.auth.AuthRequest;
import com.mlutil.ml_utilities_system.dto.auth.AuthResponse;
import com.mlutil.ml_utilities_system.dto.auth.RegisterRequest;
import com.mlutil.ml_utilities_system.model.Role;
import com.mlutil.ml_utilities_system.model.User;
import com.mlutil.ml_utilities_system.repository.RoleRepository;
import com.mlutil.ml_utilities_system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@Transactional // Rollback changes after each test
class AuthControllerIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private Role userRole;

    @BeforeEach
    void setUp() {
        // Ensure roles exist for testing
        Optional<Role> existingUserRole = roleRepository.findByName("ROLE_USER");
        if (existingUserRole.isEmpty()) {
            userRole = roleRepository.save(Role.builder().name("ROLE_USER").build());
        } else {
            userRole = existingUserRole.get();
        }
        // Admin role from V2__seed_data.sql should be present
    }

    @Test
    @DisplayName("Should register a new user successfully")
    void shouldRegisterNewUserSuccessfully() throws Exception {
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("newtestuser")
                .email("newtest@example.com")
                .password("securepassword")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("newtestuser"))
                .andExpect(jsonPath("$.email").value("newtest@example.com"));

        assertThat(userRepository.findByUsername("newtestuser")).isPresent();
    }

    @Test
    @DisplayName("Should return 400 Bad Request if registration request is invalid")
    void shouldReturnBadRequestForInvalidRegistration() throws Exception {
        RegisterRequest invalidRequest = RegisterRequest.builder()
                .username("ab") // Too short
                .email("invalid-email") // Invalid format
                .password("123") // Too short
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.username").exists())
                .andExpect(jsonPath("$.email").exists())
                .andExpect(jsonPath("$.password").exists());
    }

    @Test
    @DisplayName("Should return 409 Conflict if username already exists during registration")
    void shouldReturnConflictWhenUsernameExists() throws Exception {
        // Create a user first
        User existingUser = User.builder()
                .id(UUID.randomUUID())
                .username("existinguser")
                .email("existing@example.com")
                .password(passwordEncoder.encode("password"))
                .roles(Set.of(userRole))
                .build();
        userRepository.save(existingUser);

        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("existinguser") // Duplicate username
                .email("another@example.com")
                .password("securepassword")
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username already taken: existinguser"));
    }

    @Test
    @DisplayName("Should authenticate existing user and return JWT token")
    void shouldAuthenticateUserAndReturnToken() throws Exception {
        // Create a user with known credentials
        String username = "authuser";
        String password = "authpassword";
        User user = User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email("auth@example.com")
                .password(passwordEncoder.encode(password))
                .roles(Set.of(userRole))
                .build();
        userRepository.save(user);

        AuthRequest authRequest = AuthRequest.builder()
                .username(username)
                .password(password)
                .build();

        String responseContent = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andReturn().getResponse().getContentAsString();

        AuthResponse authResponse = objectMapper.readValue(responseContent, AuthResponse.class);
        assertThat(authResponse.getToken()).isNotNull().isNotEmpty();
    }

    @Test
    @DisplayName("Should return 401 Unauthorized for invalid login credentials")
    void shouldReturnUnauthorizedForInvalidCredentials() throws Exception {
        // A user exists, but we'll try to log in with wrong password
        String username = "badloginuser";
        String password = "correctpassword";
        User user = User.builder()
                .id(UUID.randomUUID())
                .username(username)
                .email("badlogin@example.com")
                .password(passwordEncoder.encode(password))
                .roles(Set.of(userRole))
                .build();
        userRepository.save(user);

        AuthRequest authRequest = AuthRequest.builder()
                .username(username)
                .password("wrongpassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("Should return 401 Unauthorized for non-existent user login attempt")
    void shouldReturnUnauthorizedForNonExistentUser() throws Exception {
        AuthRequest authRequest = AuthRequest.builder()
                .username("nonexistentuser")
                .password("anypassword")
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }
}
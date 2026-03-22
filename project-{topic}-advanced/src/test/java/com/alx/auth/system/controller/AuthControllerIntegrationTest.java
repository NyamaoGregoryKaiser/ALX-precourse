package com.alx.auth.system.controller;

import com.alx.auth.system.data.dto.AuthenticationRequest;
import com.alx.auth.system.data.dto.AuthenticationResponse;
import com.alx.auth.system.data.dto.RegisterRequest;
import com.alx.auth.system.data.entity.Role;
import com.alx.auth.system.data.entity.User;
import com.alx.auth.system.data.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link AuthController}.
 * These tests focus on end-to-end scenarios for user registration and authentication,
 * involving the web layer, service layer, and database.
 * Uses Testcontainers for a real PostgreSQL instance.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test") // Activates application-test.yml for testing configurations
@Transactional // Ensures each test runs in a transaction and rolls back changes
@DisplayName("AuthController Integration Tests")
class AuthControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private RegisterRequest registerRequest;
    private AuthenticationRequest authenticationRequest;

    @BeforeEach
    void setUp() {
        // Clear users before each test to ensure a clean state
        userRepository.deleteAll();

        registerRequest = RegisterRequest.builder()
                .firstname("Test")
                .lastname("User")
                .email("test@example.com")
                .password("password123")
                .build();

        authenticationRequest = AuthenticationRequest.builder()
                .email("test@example.com")
                .password("password123")
                .build();
    }

    @Test
    @DisplayName("Should successfully register a new user and return JWT token")
    void register_Success() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.tokenType").value("Bearer"));

        // Verify user is saved in the database
        assertTrue(userRepository.findByEmail("test@example.com").isPresent());
    }

    @Test
    @DisplayName("Should return 409 CONFLICT if registering with existing email")
    void register_DuplicateEmail_ReturnsConflict() throws Exception {
        // First registration (successful)
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        // Second registration with the same email (should conflict)
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("User with email test@example.com already exists."));
    }

    @Test
    @DisplayName("Should return 400 BAD REQUEST for invalid registration input")
    void register_InvalidInput_ReturnsBadRequest() throws Exception {
        RegisterRequest invalidRequest = RegisterRequest.builder()
                .firstname("") // Invalid
                .lastname("User")
                .email("invalid-email") // Invalid
                .password("short") // Invalid
                .build();

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists()); // Check for validation error messages
    }

    @Test
    @DisplayName("Should successfully authenticate an existing user and return JWT token")
    void authenticate_Success() throws Exception {
        // Register a user first
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        // Then authenticate
        mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authenticationRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    @DisplayName("Should return 401 UNAUTHORIZED for invalid authentication credentials")
    void authenticate_InvalidCredentials_ReturnsUnauthorized() throws Exception {
        // Register a user first
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        // Attempt to authenticate with wrong password
        AuthenticationRequest wrongPasswordRequest = AuthenticationRequest.builder()
                .email("test@example.com")
                .password("wrongpassword")
                .build();

        mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(wrongPasswordRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    @DisplayName("Should return 401 UNAUTHORIZED for non-existent user authentication")
    void authenticate_NonExistentUser_ReturnsUnauthorized() throws Exception {
        AuthenticationRequest nonExistentUserRequest = AuthenticationRequest.builder()
                .email("nonexistent@example.com")
                .password("password123")
                .build();

        mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(nonExistentUserRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }

    @Test
    @DisplayName("Should return 400 BAD REQUEST for invalid authentication input")
    void authenticate_InvalidInput_ReturnsBadRequest() throws Exception {
        AuthenticationRequest invalidRequest = AuthenticationRequest.builder()
                .email("invalid-email") // Invalid
                .password("") // Invalid
                .build();

        mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists()); // Check for validation error messages
    }

    @Test
    @DisplayName("Should refresh token successfully (simplified re-authenticate)")
    void refreshToken_Success() throws Exception {
        // Register and authenticate to get a valid token initially
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk());

        MvcResult authResult = mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authenticationRequest)))
                .andExpect(status().isOk())
                .andReturn();

        AuthenticationResponse originalResponse = objectMapper.readValue(authResult.getResponse().getContentAsString(), AuthenticationResponse.class);
        assertNotNull(originalResponse.getToken());

        // Perform refresh (re-authenticate in this simplified version)
        MvcResult refreshResult = mockMvc.perform(post("/api/v1/auth/refresh-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authenticationRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andReturn();

        AuthenticationResponse refreshedResponse = objectMapper.readValue(refreshResult.getResponse().getContentAsString(), AuthenticationResponse.class);
        assertNotNull(refreshedResponse.getToken());
        assertNotEquals(originalResponse.getToken(), refreshedResponse.getToken()); // Tokens should be different if re-issued
    }
}
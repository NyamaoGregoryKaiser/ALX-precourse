```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.auth.AuthRequest;
import com.alx.taskmgr.dto.auth.AuthResponse;
import com.alx.taskmgr.dto.auth.RegisterRequest;
import com.alx.taskmgr.exception.DuplicateResourceException;
import com.alx.taskmgr.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * API (Controller) tests for {@link AuthController} using Spring MockMvc.
 * Focuses on testing the HTTP endpoints, request/response serialization,
 * and integration with the mocked {@link AuthService}.
 * Uses {@link WebMvcTest} to only load web-related components.
 */
@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService; // Mock the service layer

    private RegisterRequest registerRequest;
    private AuthRequest authRequest;
    private AuthResponse authResponse;

    @BeforeEach
    void setUp() {
        registerRequest = RegisterRequest.builder()
                .fullName("Test User")
                .email("test@example.com")
                .password("password123")
                .build();

        authRequest = AuthRequest.builder()
                .email("test@example.com")
                .password("password123")
                .build();

        authResponse = AuthResponse.builder()
                .token("test_jwt_token")
                .build();
    }

    @Test
    @DisplayName("Should register a new user successfully and return 201 Created")
    void register_Success_Returns201() throws Exception {
        // Given
        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        // When & Then
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value(authResponse.getToken()));
    }

    @Test
    @DisplayName("Should return 400 Bad Request for invalid registration input")
    void register_InvalidInput_Returns400() throws Exception {
        // Given
        registerRequest.setEmail("invalid-email"); // Invalid email
        registerRequest.setPassword("123"); // Too short password

        // When & Then
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.email").value("Email should be valid"))
                .andExpect(jsonPath("$.errors.password").value("Password must be at least 6 characters long"));
    }

    @Test
    @DisplayName("Should return 409 Conflict if email already exists during registration")
    void register_DuplicateEmail_Returns409() throws Exception {
        // Given
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new DuplicateResourceException("User with email test@example.com already exists."));

        // When & Then
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("User with email test@example.com already exists."));
    }

    @Test
    @DisplayName("Should authenticate user successfully and return 200 OK")
    void authenticate_Success_Returns200() throws Exception {
        // Given
        when(authService.authenticate(any(AuthRequest.class))).thenReturn(authResponse);

        // When & Then
        mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(authResponse.getToken()));
    }

    @Test
    @DisplayName("Should return 400 Bad Request for invalid authentication input")
    void authenticate_InvalidInput_Returns400() throws Exception {
        // Given
        authRequest.setEmail("invalid-email"); // Invalid email
        authRequest.setPassword(""); // Empty password

        // When & Then
        mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.email").value("Email should be valid"))
                .andExpect(jsonPath("$.errors.password").value("Password cannot be empty"));
    }

    @Test
    @DisplayName("Should return 401 Unauthorized for bad credentials during authentication")
    void authenticate_BadCredentials_Returns401() throws Exception {
        // Given
        when(authService.authenticate(any(AuthRequest.class)))
                .thenThrow(new BadCredentialsException("Invalid email or password."));

        // When & Then
        mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password."));
    }
}
```
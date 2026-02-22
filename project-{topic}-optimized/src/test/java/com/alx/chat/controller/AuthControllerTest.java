```java
package com.alx.chat.controller;

import com.alx.chat.dto.LoginRequest;
import com.alx.chat.dto.RegisterRequest;
import com.alx.chat.dto.AuthResponse;
import com.alx.chat.exception.BadRequestException;
import com.alx.chat.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.servlet.setup.MockMvcBuilders.standaloneSetup;

// @WebMvcTest slices tests for controllers, disabling full Spring context load.
// We explicitly include SecurityConfig if we want it to apply, but for pure AuthController,
// we often mock Security contexts or services.
@WebMvcTest(AuthController.class)
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    // We need to mock Spring Security setup that normally happens for @WebMvcTest.
    // However, for this specific controller (Auth), we usually don't need a full security context
    // as it handles authentication itself. If other controllers were tested, we'd use @WithMockUser.
    @BeforeEach
    public void setup() {
        // This ensures that the controller's validation annotations are processed
        // without needing a full Spring Security context for auth endpoints.
        mockMvc = standaloneSetup(new AuthController(authService))
                .build();
    }

    @Test
    void registerUser_success() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setEmail("test@example.com");
        request.setPassword("password123");

        doNothing().when(authService).registerUser(any(RegisterRequest.class));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$").value("User registered successfully!"));
    }

    @Test
    void registerUser_usernameTaken() throws Exception {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("existinguser");
        request.setEmail("test@example.com");
        request.setPassword("password123");

        doThrow(new BadRequestException("Username is already taken!"))
                .when(authService).registerUser(any(RegisterRequest.class));

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username is already taken!"));
    }

    @Test
    void registerUser_invalidInput() throws Exception {
        RegisterRequest request = new RegisterRequest(); // Missing username, email, password
        request.setUsername("sh"); // Too short username
        request.setEmail("invalid-email"); // Invalid email
        request.setPassword("short"); // Too short password

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation Failed"));
                // Further checks could verify specific field errors
    }

    @Test
    void authenticateUser_success() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsernameOrEmail("testuser");
        request.setPassword("password123");

        AuthResponse authResponse = new AuthResponse("jwtToken", "Bearer", 1L, "testuser", "test@example.com", List.of("ROLE_USER"));
        when(authService.authenticateUser(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwtToken"))
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"));
    }

    @Test
    void authenticateUser_invalidCredentials() throws Exception {
        LoginRequest request = new LoginRequest();
        request.setUsernameOrEmail("wronguser");
        request.setPassword("wrongpass");

        when(authService.authenticateUser(any(LoginRequest.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Invalid credentials"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized()) // Spring Security's default for BadCredentials
                .andExpect(jsonPath("$.error").value("Unauthorized"));
    }
}
```
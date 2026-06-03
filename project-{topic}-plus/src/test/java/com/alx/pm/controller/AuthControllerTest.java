```java
package com.alx.pm.controller;

import com.alx.pm.dto.JwtResponse;
import com.alx.pm.dto.LoginRequest;
import com.alx.pm.dto.RegisterRequest;
import com.alx.pm.exception.ApiException;
import com.alx.pm.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @Autowired
    private ObjectMapper objectMapper;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");

        loginRequest = new LoginRequest();
        loginRequest.setUsername("testuser");
        loginRequest.setPassword("password123");
    }

    @Test
    void registerUser_success() throws Exception {
        doNothing().when(authService).registerUser(any(RegisterRequest.class));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        verify(authService, times(1)).registerUser(any(RegisterRequest.class));
    }

    @Test
    void registerUser_usernameExists_failure() throws Exception {
        doThrow(new ApiException(HttpStatus.BAD_REQUEST, "Username is already taken!"))
                .when(authService).registerUser(any(RegisterRequest.class));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username is already taken!"));

        verify(authService, times(1)).registerUser(any(RegisterRequest.class));
    }

    @Test
    void registerUser_invalidInput_failure() throws Exception {
        registerRequest.setUsername(""); // Invalid username

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.username").exists());

        verify(authService, never()).registerUser(any(RegisterRequest.class));
    }


    @Test
    void authenticateUser_success() throws Exception {
        String jwtToken = "mocked.jwt.token";
        when(authService.authenticateUser(any(LoginRequest.class))).thenReturn(jwtToken);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value(jwtToken))
                .andExpect(jsonPath("$.type").value("Bearer"));

        verify(authService, times(1)).authenticateUser(any(LoginRequest.class));
    }

    @Test
    void authenticateUser_invalidCredentials_failure() throws Exception {
        when(authService.authenticateUser(any(LoginRequest.class)))
                .thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());

        verify(authService, times(1)).authenticateUser(any(LoginRequest.class));
    }

    @Test
    void authenticateUser_invalidInput_failure() throws Exception {
        loginRequest.setUsername(""); // Invalid username

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.validationErrors.username").exists());

        verify(authService, never()).authenticateUser(any(LoginRequest.class));
    }
}
```
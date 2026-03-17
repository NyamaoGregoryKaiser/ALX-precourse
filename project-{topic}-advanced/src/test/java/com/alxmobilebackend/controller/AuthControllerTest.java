```java
package com.alxmobilebackend.controller;

import com.alxmobilebackend.dto.AuthRequest;
import com.alxmobilebackend.dto.AuthResponse;
import com.alxmobilebackend.dto.RegisterRequest;
import com.alxmobilebackend.exception.ValidationException;
import com.alxmobilebackend.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static com.alxmobilebackend.util.Constants.AUTH_PATH;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@ActiveProfiles("test")
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @Test
    @DisplayName("Should register a new user successfully")
    void registerUser_success() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("testuser");
        registerRequest.setEmail("test@example.com");
        registerRequest.setPassword("password123");

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mocked.jwt.token")
                .username("testuser")
                .email("test@example.com")
                .userId(1L)
                .build();

        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post(AUTH_PATH + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("test@example.com"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("Should return 400 Bad Request if registration fails due to validation")
    void registerUser_validationFail() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest(); // Missing fields
        registerRequest.setUsername("");
        registerRequest.setEmail("invalid-email");
        registerRequest.setPassword("short");

        mockMvc.perform(post(AUTH_PATH + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray())
                .andExpect(jsonPath("$.errors[0]").exists());
    }

    @Test
    @DisplayName("Should return 400 Bad Request if registration fails due to existing user")
    void registerUser_existingUser_fail() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("existinguser");
        registerRequest.setEmail("existing@example.com");
        registerRequest.setPassword("password123");

        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new ValidationException("Username is already taken!"));

        mockMvc.perform(post(AUTH_PATH + "/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username is already taken!"));
    }

    @Test
    @DisplayName("Should authenticate user successfully")
    void authenticateUser_success() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsernameOrEmail("test@example.com");
        authRequest.setPassword("password123");

        AuthResponse authResponse = AuthResponse.builder()
                .accessToken("mocked.jwt.token")
                .username("testuser")
                .email("test@example.com")
                .userId(1L)
                .build();

        when(authService.authenticate(any(AuthRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post(AUTH_PATH + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.accessToken").isNotEmpty());
    }

    @Test
    @DisplayName("Should return 400 Bad Request if authentication fails due to validation")
    void authenticateUser_validationFail() throws Exception {
        AuthRequest authRequest = new AuthRequest(); // Missing fields
        authRequest.setUsernameOrEmail("");
        authRequest.setPassword("");

        mockMvc.perform(post(AUTH_PATH + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray())
                .andExpect(jsonPath("$.errors[0]").exists());
    }

    @Test
    @DisplayName("Should return 401 Unauthorized if authentication fails")
    void authenticateUser_invalidCredentials() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsernameOrEmail("invalid@example.com");
        authRequest.setPassword("wrongpassword");

        when(authService.authenticate(any(AuthRequest.class)))
                .thenThrow(new org.springframework.security.authentication.BadCredentialsException("Invalid credentials"));

        mockMvc.perform(post(AUTH_PATH + "/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid credentials"));
    }
}
```

**Note on `SecurityConfig` for testing:** When using `@WebMvcTest`, Spring Security is active. For `AuthControllerTest`, we usually don't need a full security context as it handles public endpoints. However, for `UserControllerTest` and `ProductControllerTest` (which are secured), we'll need to mock authentication or use `@WithMockUser`.
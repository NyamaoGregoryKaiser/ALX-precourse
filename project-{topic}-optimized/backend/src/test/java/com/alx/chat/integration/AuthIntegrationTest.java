```java
package com.alx.chat.integration;

import com.alx.chat.dto.AuthRequest;
import com.alx.chat.dto.AuthResponse;
import com.alx.chat.dto.RegisterRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Integration tests for AuthController endpoints using MockMvc and Testcontainers.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test") // Use a test profile for specific configurations (e.g., in-memory DB or Testcontainers)
@Testcontainers // This annotation would typically be on a base class or configured via a Spring test context.
                // For simplicity here, assume Testcontainers setup in a broader context or Spring's dynamic property source.
                // In a real project, consider AbstractIntegrationTest class with @Container or @DynamicPropertySource.
@Transactional // Rollback transactions after each test
class AuthIntegrationTest extends AbstractIntegrationTest { // Extends base class for Testcontainers setup

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Should register a new user successfully")
    void registerUser_Success() throws Exception {
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("newuser")
                .email("new@example.com")
                .password("password123")
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.username").value("newuser"))
                .andReturn();

        AuthResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(response.getAccessToken()).isNotNull();
    }

    @Test
    @DisplayName("Should return conflict when registering with existing username")
    void registerUser_ExistingUsername_Conflict() throws Exception {
        // Register first user
        RegisterRequest registerRequest1 = RegisterRequest.builder()
                .username("existinguser")
                .email("exist1@example.com")
                .password("password123")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest1)))
                .andExpect(status().isCreated());

        // Attempt to register second user with same username
        RegisterRequest registerRequest2 = RegisterRequest.builder()
                .username("existinguser")
                .email("exist2@example.com")
                .password("password123")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username 'existinguser' is already taken."));
    }

    @Test
    @DisplayName("Should return conflict when registering with existing email")
    void registerUser_ExistingEmail_Conflict() throws Exception {
        // Register first user
        RegisterRequest registerRequest1 = RegisterRequest.builder()
                .username("useremail1")
                .email("sameemail@example.com")
                .password("password123")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest1)))
                .andExpect(status().isCreated());

        // Attempt to register second user with same email
        RegisterRequest registerRequest2 = RegisterRequest.builder()
                .username("useremail2")
                .email("sameemail@example.com")
                .password("password123")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest2)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email 'sameemail@example.com' is already registered."));
    }

    @Test
    @DisplayName("Should log in an existing user successfully")
    void loginUser_Success() throws Exception {
        // First, register a user
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("loginuser")
                .email("login@example.com")
                .password("password123")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        // Then, try to log in
        AuthRequest authRequest = AuthRequest.builder()
                .username("loginuser")
                .password("password123")
                .build();

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.username").value("loginuser"))
                .andReturn();

        AuthResponse response = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(response.getAccessToken()).isNotNull();
    }

    @Test
    @DisplayName("Should return unauthorized for invalid login credentials")
    void loginUser_InvalidCredentials_Unauthorized() throws Exception {
        // No user registered, or register one and use wrong password
        RegisterRequest registerRequest = RegisterRequest.builder()
                .username("wrongpassuser")
                .email("wrongpass@example.com")
                .password("correctpass")
                .build();
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated());

        AuthRequest authRequest = AuthRequest.builder()
                .username("wrongpassuser")
                .password("wrongpassword") // Incorrect password
                .build();

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password."));
    }

    @Test
    @DisplayName("Should return bad request for invalid registration data")
    void registerUser_InvalidData_BadRequest() throws Exception {
        RegisterRequest invalidRequest = RegisterRequest.builder()
                .username("us") // Too short
                .email("invalid-email")
                .password("short") // Too short
                .build();

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.username").value("Username must be between 3 and 50 characters"))
                .andExpect(jsonPath("$.email").value("Invalid email format"))
                .andExpect(jsonPath("$.password").value("Password must be at least 6 characters"));
    }
}
```
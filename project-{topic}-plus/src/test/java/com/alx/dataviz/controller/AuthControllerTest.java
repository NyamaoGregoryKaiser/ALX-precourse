```java
package com.alx.dataviz.controller;

import com.alx.dataviz.dto.AuthRequest;
import com.alx.dataviz.dto.AuthResponse;
import com.alx.dataviz.dto.UserDto;
import com.alx.dataviz.exception.GlobalExceptionHandler;
import com.alx.dataviz.model.Role;
import com.alx.dataviz.model.User;
import com.alx.dataviz.repository.UserRepository;
import com.alx.dataviz.service.JwtService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@Transactional
class AuthControllerTest {

    @Container
    public static PostgreSQLContainer<?> postgresContainer = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "update"); // Allow schema updates from model
        registry.add("application.security.jwt.secret-key", () -> "c2VjcmV0S2V5Rm9yVGVzdGluZ0pXVE1hc2hvMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjI=");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User testUser;
    private UserDto registerUserDto;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll(); // Clean up before each test

        testUser = User.builder()
                .username("existinguser")
                .email("existing@example.com")
                .password(passwordEncoder.encode("password123"))
                .roles(Collections.singleton(Role.USER))
                .build();
        userRepository.save(testUser);

        registerUserDto = new UserDto();
        registerUserDto.setUsername("newuser");
        registerUserDto.setEmail("new@example.com");
        registerUserDto.setPassword("newpassword");
    }

    @Test
    @DisplayName("Should register a new user and return HTTP 201 Created")
    void registerUser_Success() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerUserDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.username").value("newuser"))
                .andExpect(jsonPath("$.email").value("new@example.com"))
                .andExpect(jsonPath("$.roles[0]").value("USER"));

        assertThat(userRepository.findByUsername("newuser")).isPresent();
    }

    @Test
    @DisplayName("Should return HTTP 400 Bad Request if username is already taken during registration")
    void registerUser_UsernameTaken() throws Exception {
        registerUserDto.setUsername("existinguser"); // Attempt to register with existing username

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerUserDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("BAD_REQUEST"));
    }

    @Test
    @DisplayName("Should return HTTP 400 Bad Request for invalid registration data (e.g., blank username)")
    void registerUser_InvalidInput() throws Exception {
        registerUserDto.setUsername(""); // Invalid username

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerUserDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.username").exists());
    }

    @Test
    @DisplayName("Should authenticate user and return JWT token with HTTP 200 OK")
    void login_Success() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("existinguser");
        authRequest.setPassword("password123");

        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.username").value("existinguser"))
                .andReturn();

        AuthResponse authResponse = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class);
        assertThat(jwtService.isTokenValid(authResponse.getToken(), testUser)).isTrue();
    }

    @Test
    @DisplayName("Should return HTTP 401 Unauthorized for invalid login credentials")
    void login_InvalidCredentials() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("existinguser");
        authRequest.setPassword("wrongpassword");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.errorCode").value("BAD_CREDENTIALS"));
    }

    @Test
    @DisplayName("Should return HTTP 400 Bad Request for invalid login data (e.g., blank password)")
    void login_InvalidInput() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("existinguser");
        authRequest.setPassword(""); // Invalid password

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }
}
```
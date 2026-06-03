```java
package com.alx.vizflow.controller;

import com.alx.vizflow.dto.AuthRequest;
import com.alx.vizflow.dto.AuthResponse;
import com.alx.vizflow.dto.UserRegistrationRequest;
import com.alx.vizflow.model.Role;
import com.alx.vizflow.model.User;
import com.alx.vizflow.repository.RoleRepository;
import com.alx.vizflow.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_EACH_TEST_METHOD) // Ensures fresh state for each test method
@DisplayName("Auth Controller Integration Tests")
class AuthControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("vizflow_test_db")
            .withUsername("test_user")
            .withPassword("test_password");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create"); // Create schema for tests
        registry.add("jwt.secret", () -> "a_very_long_and_secret_key_for_testing_purposes_1234567890");
        registry.add("jwt.expiration", () -> "3600000"); // 1 hour
    }

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

    @BeforeEach
    void setUp() {
        // Ensure roles exist for registration/user setup
        if (roleRepository.findByName(Role.RoleName.ROLE_USER).isEmpty()) {
            roleRepository.save(new Role(null, Role.RoleName.ROLE_USER));
        }
        if (roleRepository.findByName(Role.RoleName.ROLE_ADMIN).isEmpty()) {
            roleRepository.save(new Role(null, Role.RoleName.ROLE_ADMIN));
        }
        userRepository.deleteAll(); // Clear users before each test
    }

    @Test
    void testRegisterUser_Success() throws Exception {
        UserRegistrationRequest request = new UserRegistrationRequest();
        request.setUsername("newUser");
        request.setEmail("newuser@example.com");
        request.setPassword("strongPassword");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$").value("User registered successfully!"));

        assertThat(userRepository.findByUsername("newUser")).isPresent();
    }

    @Test
    void testRegisterUser_UsernameAlreadyExists() throws Exception {
        // First, register a user
        Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER).orElseThrow();
        User existingUser = new User(null, "existingUser", passwordEncoder.encode("password"), "existing@example.com",
                new HashSet<>(Collections.singletonList(userRole)), null, null);
        userRepository.save(existingUser);

        // Try to register with the same username
        UserRegistrationRequest request = new UserRegistrationRequest();
        request.setUsername("existingUser");
        request.setEmail("another@example.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$").value("Username existingUser already taken."));
    }

    @Test
    void testLogin_Success() throws Exception {
        // Pre-register a user
        Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER).orElseThrow();
        User user = new User(null, "loginUser", passwordEncoder.encode("loginPassword"), "login@example.com",
                new HashSet<>(Collections.singletonList(userRole)), null, null);
        userRepository.save(user);

        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("loginUser");
        authRequest.setPassword("loginPassword");

        ResultActions result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk());

        String responseContent = result.andReturn().getResponse().getContentAsString();
        AuthResponse authResponse = objectMapper.readValue(responseContent, AuthResponse.class);

        assertThat(authResponse.getJwt()).isNotBlank();
        assertThat(authResponse.getUsername()).isEqualTo("loginUser");
        assertThat(authResponse.getRole()).contains("ROLE_USER");
    }

    @Test
    void testLogin_InvalidCredentials() throws Exception {
        // Pre-register a user
        Role userRole = roleRepository.findByName(Role.RoleName.ROLE_USER).orElseThrow();
        User user = new User(null, "invalidUser", passwordEncoder.encode("correctPassword"), "invalid@example.com",
                new HashSet<>(Collections.singletonList(userRole)), null, null);
        userRepository.save(user);

        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("invalidUser");
        authRequest.setPassword("wrongPassword"); // Wrong password

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$").value("Invalid username or password."));
    }
}
```
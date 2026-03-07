```java
package com.ml.utilities.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml.utilities.system.dto.AuthRequest;
import com.ml.utilities.system.dto.UserDTO;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.RoleRepository;
import com.ml.utilities.system.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Collections;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AuthControllerTest {

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
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
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
        userRepository.deleteAll();
        roleRepository.deleteAll();

        // Ensure default roles exist for testing registration
        if (roleRepository.findByName("USER").isEmpty()) {
            roleRepository.save(new Role("USER"));
        }
        if (roleRepository.findByName("ADMIN").isEmpty()) {
            roleRepository.save(new Role("ADMIN"));
        }
    }

    @Test
    void registerUser_Success() throws Exception {
        UserDTO userDTO = new UserDTO(null, "newuser", "new@example.com", "password123", Collections.singleton("USER"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.message").value("User registered successfully!"));
    }

    @Test
    void registerUser_UserAlreadyExists() throws Exception {
        User existingUser = new User();
        existingUser.setUsername("existinguser");
        existingUser.setEmail("existing@example.com");
        existingUser.setPassword(passwordEncoder.encode("password123"));
        existingUser.setRoles(Collections.singleton(roleRepository.findByName("USER").get()));
        userRepository.save(existingUser);

        UserDTO userDTO = new UserDTO(null, "existinguser", "another@example.com", "password123", Collections.singleton("USER"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userDTO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("User with username 'existinguser' already exists."));
    }

    @Test
    void registerUser_InvalidInput() throws Exception {
        UserDTO userDTO = new UserDTO(null, "u", "invalid-email", "pass", Collections.singleton("USER")); // Invalid username and email

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.username").exists())
                .andExpect(jsonPath("$.email").exists())
                .andExpect(jsonPath("$.password").exists());
    }


    @Test
    void login_Success() throws Exception {
        User newUser = new User();
        newUser.setUsername("loginuser");
        newUser.setEmail("login@example.com");
        newUser.setPassword(passwordEncoder.encode("loginpass"));
        newUser.setRoles(Collections.singleton(roleRepository.findByName("USER").get()));
        userRepository.save(newUser);

        AuthRequest authRequest = new AuthRequest("loginuser", "loginpass");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").exists())
                .andExpect(jsonPath("$.message").value("Authentication successful!"));
    }

    @Test
    void login_InvalidCredentials() throws Exception {
        User newUser = new User();
        newUser.setUsername("wrongpassuser");
        newUser.setEmail("wrong@example.com");
        newUser.setPassword(passwordEncoder.encode("correctpass"));
        newUser.setRoles(Collections.singleton(roleRepository.findByName("USER").get()));
        userRepository.save(newUser);

        AuthRequest authRequest = new AuthRequest("wrongpassuser", "incorrectpass");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password."));
    }

    @Test
    void login_UserNotFound() throws Exception {
        AuthRequest authRequest = new AuthRequest("nonexistent", "password");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password."));
    }
}
```
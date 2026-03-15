package com.ml_utilities_system.integration.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml_utilities_system.MlUtilitiesSystemApplication;
import com.ml_utilities_system.config.jwt.JwtUtils;
import com.ml_utilities_system.dto.AuthRequest;
import com.ml_utilities_system.dto.UserRegisterRequest;
import com.ml_utilities_system.model.ERole;
import com.ml_utilities_system.model.Role;
import com.ml_utilities_system.model.User;
import com.ml_utilities_system.repository.RoleRepository;
import com.ml_utilities_system.repository.UserRepository;
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
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = MlUtilitiesSystemApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test") // Use in-memory H2 database for tests
@DisplayName("AuthController Integration Tests")
class AuthControllerIntegrationTest {

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

    @Autowired
    private JwtUtils jwtUtils;

    private static boolean setupDone = false;

    @BeforeEach
    void setUp() {
        if (!setupDone) {
            // Clear repositories and set up roles/users once
            userRepository.deleteAll();
            roleRepository.deleteAll();

            roleRepository.save(new Role(null, ERole.ROLE_USER));
            roleRepository.save(new Role(null, ERole.ROLE_MODERATOR));
            roleRepository.save(new Role(null, ERole.ROLE_ADMIN));

            Role userRole = roleRepository.findByName(ERole.ROLE_USER).orElseThrow();
            Set<Role> roles = new HashSet<>();
            roles.add(userRole);

            User testUser = new User(null, "testuser", "test@example.com", passwordEncoder.encode("testpass"));
            testUser.setRoles(roles);
            userRepository.save(testUser);

            setupDone = true;
        }
    }

    @Test
    @Transactional // Ensure transaction for potential lazy loading issues
    void registerUser_Success() throws Exception {
        UserRegisterRequest registerRequest = new UserRegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setPassword("newpass");
        registerRequest.setRole(Collections.singleton("user"));

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("User registered successfully!"));
    }

    @Test
    @Transactional
    void registerUser_DuplicateUsername_BadRequest() throws Exception {
        UserRegisterRequest registerRequest = new UserRegisterRequest();
        registerRequest.setUsername("testuser"); // Already exists
        registerRequest.setEmail("another@example.com");
        registerRequest.setPassword("anotherpass");
        registerRequest.setRole(Collections.singleton("user"));

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Error: Username is already taken!"));
    }

    @Test
    @Transactional
    void authenticateUser_Success() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("testuser");
        authRequest.setPassword("testpass");

        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isString())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.roles[0]").value("ROLE_USER"));
    }

    @Test
    void authenticateUser_InvalidCredentials_Unauthorized() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("testuser");
        authRequest.setPassword("wrongpass"); // Incorrect password

        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication failed: Invalid username or password"));
    }

    @Test
    void authenticateUser_UserNotFound_Unauthorized() throws Exception {
        AuthRequest authRequest = new AuthRequest();
        authRequest.setUsername("nonexistent");
        authRequest.setPassword("anypass");

        mockMvc.perform(post("/api/auth/signin")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication failed: Invalid username or password"));
    }
}
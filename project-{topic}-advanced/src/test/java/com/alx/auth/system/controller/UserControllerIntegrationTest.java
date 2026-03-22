package com.alx.auth.system.controller;

import com.alx.auth.system.data.dto.AuthenticationRequest;
import com.alx.auth.system.data.dto.AuthenticationResponse;
import com.alx.auth.system.data.dto.UpdateUserRequest;
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

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for {@link UserController}.
 * These tests cover user profile management and admin functionalities,
 * including authentication with JWT tokens and role-based access control.
 * Uses Testcontainers for a real PostgreSQL instance.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
@DisplayName("UserController Integration Tests")
class UserControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String userToken;
    private String adminToken;
    private User testUser;
    private User adminUser;

    @BeforeEach
    void setUp() throws Exception {
        userRepository.deleteAll(); // Ensure a clean state

        // Create a regular user
        testUser = User.builder()
                .firstname("John")
                .lastname("Doe")
                .email("john.doe@example.com")
                .password(passwordEncoder.encode("password123"))
                .role(Role.USER)
                .build();
        userRepository.save(testUser);

        // Authenticate regular user to get a token
        AuthenticationRequest userAuthRequest = AuthenticationRequest.builder()
                .email(testUser.getEmail())
                .password("password123")
                .build();
        MvcResult userAuthResult = mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(userAuthRequest)))
                .andExpect(status().isOk())
                .andReturn();
        userToken = objectMapper.readValue(userAuthResult.getResponse().getContentAsString(), AuthenticationResponse.class).getToken();

        // Create an admin user
        adminUser = User.builder()
                .firstname("Admin")
                .lastname("Boss")
                .email("admin@example.com")
                .password(passwordEncoder.encode("adminpass"))
                .role(Role.ADMIN)
                .build();
        userRepository.save(adminUser);

        // Authenticate admin user to get a token
        AuthenticationRequest adminAuthRequest = AuthenticationRequest.builder()
                .email(adminUser.getEmail())
                .password("adminpass")
                .build();
        MvcResult adminAuthResult = mockMvc.perform(post("/api/v1/auth/authenticate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(adminAuthRequest)))
                .andExpect(status().isOk())
                .andReturn();
        adminToken = objectMapper.readValue(adminAuthResult.getResponse().getContentAsString(), AuthenticationResponse.class).getToken();
    }

    // --- GET /api/v1/users/me (User Profile) ---
    @Test
    @DisplayName("Should allow authenticated user to get their own profile")
    void getMyProfile_AuthenticatedUser_ReturnsProfile() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(testUser.getEmail()))
                .andExpect(jsonPath("$.firstname").value(testUser.getFirstname()));
    }

    @Test
    @DisplayName("Should return 401 UNAUTHORIZED for unauthenticated access to /me")
    void getMyProfile_Unauthenticated_ReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    // --- PUT /api/v1/users/me (Update User Profile) ---
    @Test
    @DisplayName("Should allow authenticated user to update their own profile")
    void updateMyProfile_AuthenticatedUser_UpdatesProfile() throws Exception {
        UpdateUserRequest updateRequest = UpdateUserRequest.builder()
                .firstname("Jonathan")
                .newPassword("newpassword123")
                .build();

        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstname").value("Jonathan"))
                .andExpect(jsonPath("$.lastname").value(testUser.getLastname())); // Last name unchanged

        // Verify password change indirectly (check if old password fails, new one works)
        User updatedUser = userRepository.findByEmail(testUser.getEmail()).orElseThrow();
        assertTrue(passwordEncoder.matches("newpassword123", updatedUser.getPassword()));
        assertFalse(passwordEncoder.matches("password123", updatedUser.getPassword()));
    }

    @Test
    @DisplayName("Should return 401 UNAUTHORIZED for unauthenticated access to update /me")
    void updateMyProfile_Unauthenticated_ReturnsUnauthorized() throws Exception {
        UpdateUserRequest updateRequest = UpdateUserRequest.builder().firstname("Jonathan").build();
        mockMvc.perform(put("/api/v1/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should return 400 BAD REQUEST for invalid update input")
    void updateMyProfile_InvalidInput_ReturnsBadRequest() throws Exception {
        UpdateUserRequest invalidRequest = UpdateUserRequest.builder()
                .firstname("") // Invalid
                .newPassword("short") // Invalid
                .build();

        mockMvc.perform(put("/api/v1/users/me")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    // --- GET /api/v1/users (Get All Users - Admin only) ---
    @Test
    @DisplayName("Should allow ADMIN to get all users")
    void getAllUsers_AdminUser_ReturnsAllUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2)) // Includes testUser and adminUser
                .andExpect(jsonPath("$[0].email").exists())
                .andExpect(jsonPath("$[1].email").exists());
    }

    @Test
    @DisplayName("Should return 403 FORBIDDEN for regular USER trying to get all users")
    void getAllUsers_RegularUser_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    // --- GET /api/v1/users/{id} (Get User by ID - Admin only) ---
    @Test
    @DisplayName("Should allow ADMIN to get user by ID")
    void getUserById_AdminUser_ReturnsUser() throws Exception {
        mockMvc.perform(get("/api/v1/users/" + testUser.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(testUser.getEmail()));
    }

    @Test
    @DisplayName("Should return 403 FORBIDDEN for regular USER trying to get user by ID")
    void getUserById_RegularUser_ReturnsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/users/" + testUser.getId())
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should return 404 NOT FOUND for ADMIN trying to get non-existent user by ID")
    void getUserById_AdminUser_NonExistent_ReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/users/9999") // Non-existent ID
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User with ID 9999 not found."));
    }

    // --- DELETE /api/v1/users/{id} (Delete User by ID - Admin only) ---
    @Test
    @DisplayName("Should allow ADMIN to delete a user by ID")
    void deleteUser_AdminUser_DeletesUser() throws Exception {
        mockMvc.perform(delete("/api/v1/users/" + testUser.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        assertFalse(userRepository.findByEmail(testUser.getEmail()).isPresent()); // User should be deleted
    }

    @Test
    @DisplayName("Should return 403 FORBIDDEN for regular USER trying to delete a user")
    void deleteUser_RegularUser_ReturnsForbidden() throws Exception {
        mockMvc.perform(delete("/api/v1/users/" + testUser.getId())
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should return 404 NOT FOUND for ADMIN trying to delete non-existent user")
    void deleteUser_AdminUser_NonExistent_ReturnsNotFound() throws Exception {
        mockMvc.perform(delete("/api/v1/users/9999") // Non-existent ID
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User with ID 9999 not found."));
    }
}
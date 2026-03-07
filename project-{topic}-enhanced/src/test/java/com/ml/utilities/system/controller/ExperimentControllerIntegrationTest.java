```java
package com.ml.utilities.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml.utilities.system.dto.AuthRequest;
import com.ml.utilities.system.dto.AuthResponse;
import com.ml.utilities.system.dto.ExperimentDTO;
import com.ml.utilities.system.model.Experiment;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.ExperimentRepository;
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
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ExperimentControllerIntegrationTest {

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
    private ExperimentRepository experimentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;
    private String userToken;
    private User adminUser;
    private User regularUser;

    @BeforeEach
    void setUp() throws Exception {
        experimentRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();

        Role adminRole = new Role("ADMIN");
        Role userRole = new Role("USER");
        roleRepository.save(adminRole);
        roleRepository.save(userRole);

        adminUser = new User();
        adminUser.setUsername("adminuser");
        adminUser.setEmail("admin@example.com");
        adminUser.setPassword(passwordEncoder.encode("adminpass"));
        adminUser.setRoles(Set.of(adminRole, userRole)); // Admin also has USER role for broad access
        userRepository.save(adminUser);

        regularUser = new User();
        regularUser.setUsername("regularuser");
        regularUser.setEmail("user@example.com");
        regularUser.setPassword(passwordEncoder.encode("userpass"));
        regularUser.setRoles(Set.of(userRole));
        userRepository.save(regularUser);

        // Get tokens
        adminToken = obtainJwtToken("adminuser", "adminpass");
        userToken = obtainJwtToken("regularuser", "userpass");
    }

    private String obtainJwtToken(String username, String password) throws Exception {
        AuthRequest authRequest = new AuthRequest(username, password);
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andReturn();

        String responseString = result.getResponse().getContentAsString();
        AuthResponse authResponse = objectMapper.readValue(responseString, AuthResponse.class);
        return authResponse.getToken();
    }

    @Test
    void createExperiment_AsAdmin_Success() throws Exception {
        ExperimentDTO newExperiment = new ExperimentDTO(null, "Admin Exp", "Desc",
                LocalDateTime.now(), null, "PENDING", "Obj", null, null, null);

        mockMvc.perform(post("/api/experiments")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newExperiment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Admin Exp"))
                .andExpect(jsonPath("$.createdByUserId").value(adminUser.getId()));
    }

    @Test
    void createExperiment_AsUser_Success() throws Exception {
        ExperimentDTO newExperiment = new ExperimentDTO(null, "User Exp", "Desc",
                LocalDateTime.now(), null, "PENDING", "Obj", null, null, null);

        mockMvc.perform(post("/api/experiments")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newExperiment)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("User Exp"))
                .andExpect(jsonPath("$.createdByUserId").value(regularUser.getId()));
    }

    @Test
    void createExperiment_Unauthorized() throws Exception {
        ExperimentDTO newExperiment = new ExperimentDTO(null, "Anon Exp", "Desc",
                LocalDateTime.now(), null, "PENDING", "Obj", null, null, null);

        mockMvc.perform(post("/api/experiments")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newExperiment)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getExperimentById_AsUser_Success() throws Exception {
        Experiment exp = new Experiment(null, "Test Get Exp", "Desc",
                LocalDateTime.now(), null, "RUNNING", "Obj",
                LocalDateTime.now(), LocalDateTime.now(), adminUser);
        exp = experimentRepository.save(exp);

        mockMvc.perform(get("/api/experiments/{id}", exp.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Get Exp"));
    }

    @Test
    void getExperimentById_NotFound() throws Exception {
        mockMvc.perform(get("/api/experiments/{id}", 999L)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Experiment not found with id: 999"));
    }

    @Test
    void getAllExperiments_AsAdmin_Success() throws Exception {
        experimentRepository.save(new Experiment(null, "Exp1", "Desc1", null, null, "P", "O", null, null, adminUser));
        experimentRepository.save(new Experiment(null, "Exp2", "Desc2", null, null, "P", "O", null, null, regularUser));

        mockMvc.perform(get("/api/experiments")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void updateExperiment_AsUser_Success() throws Exception {
        Experiment exp = new Experiment(null, "Exp to Update", "Old Desc",
                LocalDateTime.now(), null, "PENDING", "Old Obj",
                LocalDateTime.now(), LocalDateTime.now(), regularUser);
        exp = experimentRepository.save(exp);

        ExperimentDTO updatedDTO = new ExperimentDTO(null, "Updated Exp", "New Desc",
                null, LocalDateTime.now(), "COMPLETED", "New Obj", null, null, null);

        mockMvc.perform(put("/api/experiments/{id}", exp.getId())
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Exp"))
                .andExpect(jsonPath("$.description").value("New Desc"))
                .andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void deleteExperiment_AsAdmin_Success() throws Exception {
        Experiment exp = new Experiment(null, "Exp to Delete", "Desc",
                LocalDateTime.now(), null, "PENDING", "Obj",
                LocalDateTime.now(), LocalDateTime.now(), adminUser);
        exp = experimentRepository.save(exp);

        mockMvc.perform(delete("/api/experiments/{id}", exp.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/experiments/{id}", exp.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteExperiment_AsUser_Forbidden() throws Exception {
        Experiment exp = new Experiment(null, "Exp User Created", "Desc",
                LocalDateTime.now(), null, "PENDING", "Obj",
                LocalDateTime.now(), LocalDateTime.now(), regularUser); // User is the creator
        exp = experimentRepository.save(exp);

        mockMvc.perform(delete("/api/experiments/{id}", exp.getId())
                        .header("Authorization", "Bearer " + userToken)) // Regular user tries to delete their own
                .andExpect(status().isForbidden()); // Only ADMIN can delete, as per @PreAuthorize
    }

    @Test
    void deleteExperiment_NotFound() throws Exception {
        mockMvc.perform(delete("/api/experiments/{id}", 999L)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }
}
```
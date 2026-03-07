```java
package com.ml.utilities.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml.utilities.system.dto.AuthRequest;
import com.ml.utilities.system.dto.AuthResponse;
import com.ml.utilities.system.dto.DatasetDTO;
import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import com.ml.utilities.system.repository.DatasetRepository;
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
class DatasetControllerIntegrationTest {

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
    private DatasetRepository datasetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;
    private String userToken;
    private User adminUser;
    private User regularUser;

    @BeforeEach
    void setUp() throws Exception {
        datasetRepository.deleteAll();
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
        adminUser.setRoles(Set.of(adminRole, userRole));
        userRepository.save(adminUser);

        regularUser = new User();
        regularUser.setUsername("regularuser");
        regularUser.setEmail("user@example.com");
        regularUser.setPassword(passwordEncoder.encode("userpass"));
        regularUser.setRoles(Set.of(userRole));
        userRepository.save(regularUser);

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
    void createDataset_AsAdmin_Success() throws Exception {
        DatasetDTO newDataset = new DatasetDTO(null, "Admin Dataset", "1.0",
                "s3://admin/data.csv", "Desc", 100L, 1000L, "CSV",
                null, null, null);

        mockMvc.perform(post("/api/datasets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newDataset)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Admin Dataset"))
                .andExpect(jsonPath("$.createdByUserId").value(adminUser.getId()));
    }

    @Test
    void createDataset_AsUser_Success() throws Exception {
        DatasetDTO newDataset = new DatasetDTO(null, "User Dataset", "1.0
package com.ml_utilities_system.integration.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml_utilities_system.MlUtilitiesSystemApplication;
import com.ml_utilities_system.config.jwt.JwtUtils;
import com.ml_utilities_system.dto.DatasetDTO;
import com.ml_utilities_system.model.ERole;
import com.ml_utilities_system.model.Role;
import com.ml_utilities_system.model.User;
import com.ml_utilities_system.repository.DatasetRepository;
import com.ml_utilities_system.repository.RoleRepository;
import com.ml_utilities_system.repository.UserRepository;
import com.ml_utilities_system.service.UserDetailsImpl;
import org.junit.jupiter.api.BeforeAll;
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

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(classes = MlUtilitiesSystemApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("DatasetController Integration Tests")
class DatasetControllerIntegrationTest {

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

    @Autowired
    private JwtUtils jwtUtils;

    private static String adminToken;
    private static String userToken;
    private static String moderatorToken;
    private static Long datasetId;

    @BeforeAll
    static void setup(@Autowired UserRepository userRepository, @Autowired RoleRepository roleRepository,
                      @Autowired PasswordEncoder passwordEncoder, @Autowired JwtUtils jwtUtils,
                      @Autowired DatasetRepository datasetRepository) {
        // Clear repositories
        datasetRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();

        // Setup roles
        Role userRole = roleRepository.save(new Role(null, ERole.ROLE_USER));
        Role modRole = roleRepository.save(new Role(null, ERole.ROLE_MODERATOR));
        Role adminRole = roleRepository.save(new Role(null, ERole.ROLE_ADMIN));

        // Setup users
        Set<Role> adminRoles = new HashSet<>(List.of(adminRole));
        User adminUser = userRepository.save(new User(null, "adminTest", "admin@test.com", passwordEncoder.encode("adminpass")));
        adminUser.setRoles(adminRoles);
        userRepository.save(adminUser);
        adminToken = jwtUtils.generateJwtToken(UserDetailsImpl.build(adminUser));

        Set<Role> modRoles = new HashSet<>(List.of(modRole));
        User modUser = userRepository.save(new User(null, "modTest", "mod@test.com", passwordEncoder.encode("modpass")));
        modUser.setRoles(modRoles);
        userRepository.save(modUser);
        moderatorToken = jwtUtils.generateJwtToken(UserDetailsImpl.build(modUser));


        Set<Role> userRoles = new HashSet<>(List.of(userRole));
        User normalUser = userRepository.save(new User(null, "userTest", "user@test.com", passwordEncoder.encode("userpass")));
        normalUser.setRoles(userRoles);
        userRepository.save(normalUser);
        userToken = jwtUtils.generateJwtToken(UserDetailsImpl.build(normalUser));

        // Create initial dataset for tests
        DatasetDTO initialDataset = new DatasetDTO(null, "TestDataset", "Initial dataset for testing",
                "/data/test.csv", 1000L, "CSV", LocalDateTime.now(), LocalDateTime.now());
        com.ml_utilities_system.model.Dataset savedDataset = datasetRepository.save(
                new com.ml_utilities_system.model.Dataset(null, initialDataset.getName(), initialDataset.getDescription(),
                        initialDataset.getFilePath(), initialDataset.getSizeBytes(), initialDataset.getFormat(),
                        initialDataset.getUploadedAt(), initialDataset.getLastModifiedAt())
        );
        datasetId = savedDataset.getId();
    }

    @BeforeEach
    void resetData() {
        // Ensure the datasets are clean before each test, but roles/users are preserved
        if (!datasetRepository.findById(datasetId).isPresent()) {
            com.ml_utilities_system.model.Dataset savedDataset = datasetRepository.save(
                    new com.ml_utilities_system.model.Dataset(null, "TestDataset", "Initial dataset for testing",
                            "/data/test.csv", 1000L, "CSV", LocalDateTime.now(), LocalDateTime.now())
            );
            datasetId = savedDataset.getId();
        }
    }


    // --- GET /api/datasets/{id} ---
    @Test
    void getDatasetById_WithAdminRole_Success() throws Exception {
        mockMvc.perform(get("/api/datasets/{id}", datasetId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("TestDataset"));
    }

    @Test
    void getDatasetById_WithUserRole_Success() throws Exception {
        mockMvc.perform(get("/api/datasets/{id}", datasetId)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("TestDataset"));
    }

    @Test
    void getDatasetById_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/datasets/{id}", datasetId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getDatasetById_NotFound() throws Exception {
        mockMvc.perform(get("/api/datasets/{id}", 999L) // Non-existent ID
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Dataset not found with id: 999"));
    }

    // --- GET /api/datasets ---
    @Test
    void getAllDatasets_WithAdminRole_Success() throws Exception {
        mockMvc.perform(get("/api/datasets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value("TestDataset"));
    }

    // --- POST /api/datasets ---
    @Test
    @Transactional
    void createDataset_WithAdminRole_Success() throws Exception {
        DatasetDTO newDataset = new DatasetDTO(null, "NewDataset", "New description",
                "/data/new.csv", 2000L, "CSV", null, null);

        mockMvc.perform(post("/api/datasets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newDataset)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("NewDataset"))
                .andExpect(jsonPath("$.id").isNumber());
    }

    @Test
    @Transactional
    void createDataset_WithModeratorRole_Success() throws Exception {
        DatasetDTO newDataset = new DatasetDTO(null, "ModeratorDataset", "Description",
                "/data/mod.csv", 2000L, "CSV", null, null);

        mockMvc.perform(post("/api/datasets")
                        .header("Authorization", "Bearer " + moderatorToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newDataset)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("ModeratorDataset"));
    }

    @Test
    void createDataset_WithUserRole_Forbidden() throws Exception {
        DatasetDTO newDataset = new DatasetDTO(null, "ForbiddenDataset", "Forbidden description",
                "/data/forbidden.csv", 2000L, "CSV", null, null);

        mockMvc.perform(post("/api/datasets")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newDataset)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void createDataset_DuplicateName_BadRequest() throws Exception {
        DatasetDTO duplicateDataset = new DatasetDTO(null, "TestDataset", "Another description",
                "/data/another.csv", 1500L, "PARQUET", null, null);

        mockMvc.perform(post("/api/datasets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(duplicateDataset)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Dataset with name 'TestDataset' already exists."));
    }

    @Test
    @Transactional
    void createDataset_InvalidInput_BadRequest() throws Exception {
        DatasetDTO invalidDataset = new DatasetDTO(null, "", "Invalid description",
                "", -100L, "", null, null); // Invalid name, path, size, format

        mockMvc.perform(post("/api/datasets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDataset)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").value("Dataset name cannot be blank"))
                .andExpect(jsonPath("$.filePath").value("File path cannot be blank"))
                .andExpect(jsonPath("$.sizeBytes").value("Size in bytes must be positive"))
                .andExpect(jsonPath("$.format").value("Format cannot be blank"));
    }

    // --- PUT /api/datasets/{id} ---
    @Test
    @Transactional
    void updateDataset_WithAdminRole_Success() throws Exception {
        DatasetDTO updatedDataset = new DatasetDTO(datasetId, "UpdatedTestDataset", "Updated description",
                "/data/updated.csv", 2500L, "PARQUET", null, null);

        mockMvc.perform(put("/api/datasets/{id}", datasetId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedDataset)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("UpdatedTestDataset"))
                .andExpect(jsonPath("$.format").value("PARQUET"));
    }

    @Test
    void updateDataset_WithUserRole_Forbidden() throws Exception {
        DatasetDTO updatedDataset = new DatasetDTO(datasetId, "ForbiddenUpdate", "Updated description",
                "/data/forbidden_update.csv", 2500L, "PARQUET", null, null);

        mockMvc.perform(put("/api/datasets/{id}", datasetId)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedDataset)))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void updateDataset_NotFound_BadRequest() throws Exception {
        DatasetDTO updatedDataset = new DatasetDTO(999L, "NonExistentUpdate", "Description",
                "/data/nonexistent.csv", 100L, "CSV", null, null);

        mockMvc.perform(put("/api/datasets/{id}", 999L)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedDataset)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Dataset not found with id: 999"));
    }

    // --- DELETE /api/datasets/{id} ---
    @Test
    @Transactional
    void deleteDataset_WithAdminRole_Success() throws Exception {
        // Create a dataset to delete
        DatasetDTO datasetToDelete = new DatasetDTO(null, "DatasetToDelete", "Desc", "/path.csv", 100L, "CSV", null, null);
        String createdDatasetJson = mockMvc.perform(post("/api/datasets")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(datasetToDelete)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long idToDelete = objectMapper.readTree(createdDatasetJson).get("id").asLong();

        mockMvc.perform(delete("/api/datasets/{id}", idToDelete)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/datasets/{id}", idToDelete)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteDataset_WithModeratorRole_Forbidden() throws Exception {
        mockMvc.perform(delete("/api/datasets/{id}", datasetId)
                        .header("Authorization", "Bearer " + moderatorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteDataset_WithUserRole_Forbidden() throws Exception {
        mockMvc.perform(delete("/api/datasets/{id}", datasetId)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void deleteDataset_NotFound_BadRequest() throws Exception {
        mockMvc.perform(delete("/api/datasets/{id}", 999L)
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Dataset not found with id: 999"));
    }
}
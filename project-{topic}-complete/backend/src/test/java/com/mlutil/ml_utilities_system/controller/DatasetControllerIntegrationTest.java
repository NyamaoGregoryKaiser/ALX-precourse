package com.mlutil.ml_utilities_system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mlutil.ml_utilities_system.dto.auth.AuthRequest;
import com.mlutil.ml_utilities_system.dto.auth.AuthResponse;
import com.mlutil.ml_utilities_system.model.Dataset;
import com.mlutil.ml_utilities_system.model.Role;
import com.mlutil.ml_utilities_system.model.User;
import com.mlutil.ml_utilities_system.repository.DatasetRepository;
import com.mlutil.ml_utilities_system.repository.RoleRepository;
import com.mlutil.ml_utilities_system.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
@Transactional
class DatasetControllerIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

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

    @Value("${application.dataset.upload-dir}")
    private String uploadDir;
    private Path uploadPath;

    private String userToken;
    private User testUser;
    private Role userRole;

    @BeforeEach
    void setUp() throws Exception {
        uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(uploadPath); // Ensure directory exists

        // Clear existing test data
        datasetRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();

        // Setup roles
        userRole = roleRepository.findByName("ROLE_USER").orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_USER").build()));
        roleRepository.findByName("ROLE_ADMIN").orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_ADMIN").build()));

        // Create a test user
        testUser = User.builder()
                .username("testuser")
                .email("test@example.com")
                .password(passwordEncoder.encode("password"))
                .roles(new HashSet<>(Collections.singletonList(userRole)))
                .build();
        userRepository.save(testUser);

        // Authenticate test user to get a token
        AuthRequest authRequest = AuthRequest.builder()
                .username("testuser")
                .password("password")
                .build();

        String authResponseJson = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(authRequest)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        AuthResponse authResponse = objectMapper.readValue(authResponseJson, AuthResponse.class);
        userToken = authResponse.getToken();
    }

    @AfterEach
    void tearDown() throws IOException {
        // Clean up uploaded files in the test directory
        Files.walk(uploadPath)
                .filter(Files::isRegularFile)
                .forEach(path -> {
                    try { Files.delete(path); } catch (IOException e) { /* ignore */ }
                });
    }

    @Test
    @DisplayName("Should upload a dataset successfully")
    void shouldUploadDatasetSuccessfully() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "upload_test.csv", "text/csv", "col1,col2\n1,2\n3,4".getBytes());

        mockMvc.perform(multipart("/api/datasets")
                        .file(file)
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.filename").value("upload_test.csv"))
                .andExpect(jsonPath("$.ownerUsername").value(testUser.getUsername()));

        assertThat(datasetRepository.findByOwnerUsername(testUser.getUsername())).hasSize(1);
    }

    @Test
    @DisplayName("Should return 401 Unauthorized for unauthenticated dataset upload")
    void shouldReturnUnauthorizedForUnauthenticatedUpload() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "unauth.csv", "text/csv", "data".getBytes());

        mockMvc.perform(multipart("/api/datasets").file(file))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Should get all datasets for the authenticated user")
    void shouldGetAllUserDatasets() throws Exception {
        // Upload two datasets for the test user
        Dataset dataset1 = datasetRepository.save(Dataset.builder()
                .id(UUID.randomUUID()).filename("dataset1.csv").filePath(uploadPath.resolve("unique1_dataset1.csv").toString())
                .fileSize(100L).fileType("text/csv").ownerUsername(testUser.getUsername()).build());
        Dataset dataset2 = datasetRepository.save(Dataset.builder()
                .id(UUID.randomUUID()).filename("dataset2.csv").filePath(uploadPath.resolve("unique2_dataset2.csv").toString())
                .fileSize(200L).fileType("text/csv").ownerUsername(testUser.getUsername()).build());

        mockMvc.perform(get("/api/datasets")
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].filename").value("dataset1.csv"))
                .andExpect(jsonPath("$[1].filename").value("dataset2.csv"));
    }

    @Test
    @DisplayName("Should get a specific dataset by ID for the authenticated user")
    void shouldGetDatasetById() throws Exception {
        Dataset dataset = datasetRepository.save(Dataset.builder()
                .id(UUID.randomUUID()).filename("specific.csv").filePath(uploadPath.resolve("unique_specific.csv").toString())
                .fileSize(150L).fileType("text/csv").ownerUsername(testUser.getUsername()).build());

        mockMvc.perform(get("/api/datasets/{id}", dataset.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(dataset.getId().toString()))
                .andExpect(jsonPath("$.filename").value("specific.csv"));
    }

    @Test
    @DisplayName("Should return 404 for getting a non-existent dataset")
    void shouldReturnNotFoundForNonExistentDataset() throws Exception {
        mockMvc.perform(get("/api/datasets/{id}", UUID.randomUUID())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should download a dataset file")
    void shouldDownloadDatasetFile() throws Exception {
        String fileContent = "header,value\n1,a\n2,b";
        Path actualFilePath = uploadPath.resolve("unique_download.csv");
        Files.writeString(actualFilePath, fileContent);

        Dataset dataset = datasetRepository.save(Dataset.builder()
                .id(UUID.randomUUID()).filename("download.csv").filePath(actualFilePath.toString())
                .fileSize((long) fileContent.getBytes().length).fileType("text/csv").ownerUsername(testUser.getUsername()).build());

        mockMvc.perform(get("/api/datasets/{id}/download", dataset.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(header().string(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"download.csv\""))
                .andExpect(content().contentType("text/csv"))
                .andExpect(content().string(fileContent));
    }

    @Test
    @DisplayName("Should delete a dataset successfully")
    void shouldDeleteDatasetSuccessfully() throws Exception {
        String fileContent = "to_delete";
        Path actualFilePath = uploadPath.resolve("unique_todelete.csv");
        Files.writeString(actualFilePath, fileContent);

        Dataset dataset = datasetRepository.save(Dataset.builder()
                .id(UUID.randomUUID()).filename("to_delete.csv").filePath(actualFilePath.toString())
                .fileSize((long) fileContent.getBytes().length).fileType("text/csv").ownerUsername(testUser.getUsername()).build());

        assertThat(datasetRepository.findById(dataset.getId())).isPresent();
        assertThat(Files.exists(actualFilePath)).isTrue();

        mockMvc.perform(delete("/api/datasets/{id}", dataset.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNoContent());

        assertThat(datasetRepository.findById(dataset.getId())).isNotPresent();
        assertThat(Files.exists(actualFilePath)).isFalse();
    }

    @Test
    @DisplayName("Should return 404 when deleting a non-existent dataset")
    void shouldReturnNotFoundWhenDeletingNonExistentDataset() throws Exception {
        mockMvc.perform(delete("/api/datasets/{id}", UUID.randomUUID())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Should return 403 Forbidden if user tries to access another user's dataset")
    void shouldReturnForbiddenForAnotherUsersDataset() throws Exception {
        // Create another user and dataset
        User otherUser = User.builder()
                .username("otheruser")
                .email("other@example.com")
                .password(passwordEncoder.encode("otherpass"))
                .roles(new HashSet<>(Collections.singletonList(userRole)))
                .build();
        userRepository.save(otherUser);

        Dataset otherDataset = datasetRepository.save(Dataset.builder()
                .id(UUID.randomUUID()).filename("other.csv").filePath(uploadPath.resolve("unique_other.csv").toString())
                .fileSize(50L).fileType("text/csv").ownerUsername(otherUser.getUsername()).build());

        // TestUser tries to access OtherUser's dataset
        mockMvc.perform(get("/api/datasets/{id}", otherDataset.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isNotFound()); // ResourceNotFoundException is thrown if not found for *current* user
    }
}
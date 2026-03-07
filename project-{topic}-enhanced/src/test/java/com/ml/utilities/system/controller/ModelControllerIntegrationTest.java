```java
package com.ml.utilities.system.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ml.utilities.system.dto.AuthRequest;
import com.ml.utilities.system.dto.AuthResponse;
import com.ml.utilities.system.dto.ModelDTO;
import com.ml.utilities.system.model.*;
import com.ml.utilities.system.repository.*;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ModelControllerIntegrationTest {

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
    private ModelRepository modelRepository;

    @Autowired
    private ExperimentRepository experimentRepository;

    @Autowired
    private DatasetRepository datasetRepository;

    @Autowired
    private FeatureSetRepository featureSetRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private String adminToken;
    private String userToken;
    private User adminUser;
    private User regularUser;
    private Experiment experiment;
    private Dataset dataset;
    private FeatureSet featureSet;

    @BeforeEach
    void setUp() throws Exception {
        modelRepository.deleteAll();
        featureSetRepository.deleteAll();
        datasetRepository.deleteAll();
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
        adminUser.setRoles(Set.of(adminRole, userRole));
        userRepository.save(adminUser);

        regularUser = new User();
        regularUser.setUsername("regularuser");
        regularUser.setEmail("user@example.com");
        regularUser.setPassword(passwordEncoder.encode("userpass"));
        regularUser.setRoles(Set.of(userRole));
        userRepository.save(regularUser);

        experiment = new Experiment(null, "Test Experiment", "Desc", LocalDateTime.now(), null, "RUNNING", "Obj", null, null, adminUser);
        experimentRepository.save(experiment);

        dataset = new Dataset(null, "Test Dataset", "1.0", "s3://test.csv", "Desc", 100L, 1000L, "CSV", null, null, adminUser);
        datasetRepository.save(dataset);

        featureSet = new FeatureSet(null, "Test FeatureSet", "1.0", "Desc", dataset, "git://code", null, null, adminUser);
        featureSetRepository.save(featureSet);


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
    void createModel_AsAdmin_Success() throws Exception {
        ModelDTO newModel = new ModelDTO(null, "Admin Model", "1.0",
                experiment.getId(), dataset.getId(), featureSet.getId(),
                "s3://model_uri", "Scikit-learn", BigDecimal.valueOf(0.9),
                BigDecimal.valueOf(0.85), BigDecimal.valueOf(0.88), BigDecimal.valueOf(0.82),
                null, null, null);

        mockMvc.perform(post("/api/models")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newModel)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Admin Model"))
                .andExpect(jsonPath("$.createdByUserId").value(adminUser.getId()));
    }

    @Test
    void createModel_AsUser_Success() throws Exception {
        ModelDTO newModel = new ModelDTO(null, "User Model", "1.0",
                experiment.getId(), dataset.getId(), featureSet.getId(),
                "s3://user_model_uri", "TensorFlow", BigDecimal.valueOf(0.88),
                BigDecimal.valueOf(0.82), BigDecimal.valueOf(0.85), BigDecimal.valueOf(0.79),
                null, null, null);

        mockMvc.perform(post("/api/models")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newModel)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("User Model"))
                .andExpect(jsonPath("$.createdByUserId").value(regularUser.getId()));
    }

    @Test
    void getModelById_AsUser_Success() throws Exception {
        Model model = new Model(null, "Test Get Model", "1.0", experiment, dataset, featureSet,
                "s3://get_model_uri", "PyTorch", BigDecimal.valueOf(0.91),
                BigDecimal.valueOf(0.86), BigDecimal.valueOf(0.89), BigDecimal.valueOf(0.83),
                LocalDateTime.now(), LocalDateTime.now(), adminUser);
        model = modelRepository.save(model);

        mockMvc.perform(get("/api/models/{id}", model.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Test Get Model"));
    }

    @Test
    void getAllModels_AsAdmin_Success() throws Exception {
        modelRepository.save(new Model(null, "Model1", "1.0", experiment, dataset, featureSet, "uri", "fw", null, null, null, null, null, null, adminUser));
        modelRepository.save(new Model(null, "Model2", "1.0", experiment, dataset, featureSet, "uri", "fw", null, null, null, null, null, null, regularUser));

        mockMvc.perform(get("/api/models")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.totalElements").value(2));
    }

    @Test
    void updateModel_AsUser_Success() throws Exception {
        Model model = new Model(null, "Model to Update", "1.0", experiment, dataset, featureSet,
                "s3://old_uri", "Scikit-learn", BigDecimal.valueOf(0.9),
                BigDecimal.valueOf(0.85), BigDecimal.valueOf(0.88), BigDecimal.valueOf(0.82),
                LocalDateTime.now(), LocalDateTime.now(), regularUser);
        model = modelRepository.save(model);

        ModelDTO updatedDTO = new ModelDTO(null, "Updated Model Name", "1.1",
                experiment.getId(), dataset.getId(), featureSet.getId(),
                "s3://new_uri", "PyTorch", BigDecimal.valueOf(0.92),
                BigDecimal.valueOf(0.87), BigDecimal.valueOf(0.90), BigDecimal.valueOf(0.84),
                null, null, null);

        mockMvc.perform(put("/api/models/{id}", model.getId())
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Updated Model Name"))
                .andExpect(jsonPath("$.version").value("1.1"))
                .andExpect(jsonPath("$.framework").value("PyTorch"));
    }

    @Test
    void deleteModel_AsAdmin_Success() throws Exception {
        Model model = new Model(null, "Model to Delete", "1.0", experiment, dataset, featureSet,
                "s3://delete_uri", "Scikit-learn", BigDecimal.valueOf(0.9),
                BigDecimal.valueOf(0.85), BigDecimal.valueOf(0.88), BigDecimal.valueOf(0.82),
                LocalDateTime.now(), LocalDateTime.now(), adminUser);
        model = modelRepository.save(model);

        mockMvc.perform(delete("/api/models/{id}", model.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/models/{id}", model.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void deleteModel_AsUser_Forbidden() throws Exception {
        Model model = new Model(null, "Model User Created", "1.0", experiment, dataset, featureSet,
                "s3://user_uri", "Scikit-learn", BigDecimal.valueOf(0.9),
                BigDecimal.valueOf(0.85), BigDecimal.valueOf(0.88), BigDecimal.valueOf(0.82),
                LocalDateTime.now(), LocalDateTime.now(), regularUser);
        model = modelRepository.save(model);

        mockMvc.perform(delete("/api/models/{id}", model.getId())
                        .header("Authorization", "Bearer " + userToken))
                .andExpect(status().isForbidden());
    }
}
```
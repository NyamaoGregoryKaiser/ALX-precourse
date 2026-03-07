```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.Experiment;
import com.ml.utilities.system.model.FeatureSet;
import com.ml.utilities.system.model.Model;
import com.ml.utilities.system.model.Role;
import com.ml.utilities.system.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ModelRepositoryTest {

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
    private ModelRepository modelRepository;
    @Autowired
    private ExperimentRepository experimentRepository;
    @Autowired
    private DatasetRepository datasetRepository;
    @Autowired
    private FeatureSetRepository featureSetRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private TestEntityManager entityManager;

    private Model model1;
    private User testUser;
    private Experiment experiment;
    private Dataset dataset;
    private FeatureSet featureSet;

    @BeforeEach
    void setUp() {
        modelRepository.deleteAll();
        featureSetRepository.deleteAll();
        datasetRepository.deleteAll();
        experimentRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();

        Role userRole = new Role("USER");
        entityManager.persistAndFlush(userRole);

        testUser = new User();
        testUser.setUsername("testuser");
        testUser.setEmail("test@example.com");
        testUser.setPassword("password");
        testUser.setRoles(Set.of(userRole));
        entityManager.persistAndFlush(testUser);

        experiment = new Experiment();
        experiment.setName("Exp Test");
        experiment.setStatus("RUNNING");
        experiment.setCreatedBy(testUser);
        entityManager.persistAndFlush(experiment);

        dataset = new Dataset();
        dataset.setName("Dataset Test");
        dataset.setVersion("1.0");
        dataset.setCreatedBy(testUser);
        entityManager.persistAndFlush(dataset);

        featureSet = new FeatureSet();
        featureSet.setName("FeatureSet Test");
        featureSet.setVersion("1.0");
        featureSet.setSourceDataset(dataset);
        featureSet.setCreatedBy(testUser);
        entityManager.persistAndFlush(featureSet);

        model1 = new Model();
        model1.setName("Model A");
        model1.setVersion("1.0");
        model1.setExperiment(experiment);
        model1.setDataset(dataset);
        model1.setFeatureSet(featureSet);
        model1.setFramework("Scikit-learn");
        model1.setAccuracy(BigDecimal.valueOf(0.95));
        model1.setCreatedBy(testUser);
        entityManager.persistAndFlush(model1);

        Model model2 = new Model();
        model2.setName("Model B");
        model2.setVersion("1.0");
        model2.setFramework("TensorFlow");
        model2.setAccuracy(BigDecimal.valueOf(0.88));
        model2.setCreatedBy(testUser);
        entityManager.persistAndFlush(model2);
    }

    @Test
    void findByNameAndVersion_Found() {
        Optional<Model> foundModel = modelRepository.findByNameAndVersion("Model A", "1.0");
        assertTrue(foundModel.isPresent());
        assertEquals("Scikit-learn", foundModel.get().getFramework());
    }

    @Test
    void findByNameAndVersion_NotFound() {
        Optional<Model> foundModel = modelRepository.findByNameAndVersion("Model A", "1.1");
        assertFalse(foundModel.isPresent());
    }

    @Test
    void existsByNameAndVersion_True() {
        assertTrue(modelRepository.existsByNameAndVersion("Model A", "1.0"));
    }

    @Test
    void existsByNameAndVersion_False() {
        assertFalse(modelRepository.existsByNameAndVersion("Model C", "1.0"));
    }

    @Test
    void findAll_Pagination() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Model> modelPage = modelRepository.findAll(pageable);

        assertNotNull(modelPage);
        assertEquals(1, modelPage.getNumberOfElements());
        assertEquals(2, modelPage.getTotalElements());
        assertEquals(2, modelPage.getTotalPages());
    }

    @Test
    void saveAndRetrieveModel() {
        Model newModel = new Model();
        newModel.setName("New Model");
        newModel.setVersion("1.0");
        newModel.setFramework("PyTorch");
        newModel.setCreatedBy(testUser);
        newModel.setCreatedAt(LocalDateTime.now());
        newModel.setUpdatedAt(LocalDateTime.now());

        Model savedModel = modelRepository.save(newModel);
        entityManager.flush();
        entityManager.clear();

        Optional<Model> retrievedModel = modelRepository.findById(savedModel.getId());
        assertTrue(retrievedModel.isPresent());
        assertEquals("New Model", retrievedModel.get().getName());
        assertEquals(testUser.getId(), retrievedModel.get().getCreatedBy().getId());
    }

    @Test
    void updateModel() {
        model1.setAccuracy(BigDecimal.valueOf(0.96));
        model1.setUpdatedAt(LocalDateTime.now());
        Model updatedModel = modelRepository.save(model1);
        entityManager.flush();
        entityManager.clear();

        Optional<Model> retrievedModel = modelRepository.findById(updatedModel.getId());
        assertTrue(retrievedModel.isPresent());
        assertEquals(BigDecimal.valueOf(0.96), retrievedModel.get().getAccuracy());
    }

    @Test
    void deleteModel() {
        Long idToDelete = model1.getId();
        modelRepository.deleteById(idToDelete);
        entityManager.flush();

        Optional<Model> deletedModel = modelRepository.findById(idToDelete);
        assertFalse(deletedModel.isPresent());
    }

    @Test
    void modelAssociations_EagerLoadingNotWorking_FetchLazy() {
        // When Model is fetched, associated entities should be lazy-loaded by default
        // To test that associations are correctly stored, we fetch the model and then
        // assert on the IDs of its associations.
        Optional<Model> retrievedModel = modelRepository.findById(model1.getId());
        assertTrue(retrievedModel.isPresent());

        Model fetchedModel = retrievedModel.get();
        assertEquals(experiment.getId(), fetchedModel.getExperiment().getId());
        assertEquals(dataset.getId(), fetchedModel.getDataset().getId());
        assertEquals(featureSet.getId(), fetchedModel.getFeatureSet().getId());
        assertEquals(testUser.getId(), fetchedModel.getCreatedBy().getId());
    }
}
```
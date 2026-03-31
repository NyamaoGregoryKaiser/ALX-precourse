```java
package com.ml_utils_system.repository;

import com.ml_utils_system.model.Dataset;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Integration tests for {@link DatasetRepository}.
 * Uses Testcontainers to spin up a real PostgreSQL instance for accurate testing.
 * The '@DataJpaTest' annotation sets up an in-memory database by default, but Testcontainers overrides this.
 */
@DataJpaTest
@Testcontainers
@ActiveProfiles("test") // Use a test profile if any specific configuration is needed, e.g., to disable Flyway for test DB
public class DatasetRepositoryTest {

    @Container
    public static PostgreSQLContainer<?> postgresContainer = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void setDatasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgresContainer::getJdbcUrl);
        registry.add("spring.datasource.username", postgresContainer::getUsername);
        registry.add("spring.datasource.password", postgresContainer::getPassword);
        registry.add("spring.flyway.enabled", () -> "false"); // Disable Flyway for tests
    }

    @Autowired
    private DatasetRepository datasetRepository;

    private Dataset dataset1;
    private Dataset dataset2;

    @BeforeEach
    void setUp() {
        datasetRepository.deleteAll(); // Clean up before each test

        dataset1 = new Dataset();
        dataset1.setName("Test Dataset 1");
        dataset1.setDescription("Description for test dataset 1");
        dataset1.setStoragePath("/path/to/data1.csv");
        dataset1.setFileType("CSV");
        dataset1.setSizeBytes(1024L);
        dataset1.setNumRows(10);
        dataset1.setNumColumns(2);
        dataset1.setCreatedAt(LocalDateTime.now());
        dataset1.setUpdatedAt(LocalDateTime.now());


        dataset2 = new Dataset();
        dataset2.setName("Test Dataset 2");
        dataset2.setDescription("Description for test dataset 2");
        dataset2.setStoragePath("/path/to/data2.json");
        dataset2.setFileType("JSON");
        dataset2.setSizeBytes(2048L);
        dataset2.setNumRows(20);
        dataset2.setNumColumns(5);
        dataset2.setCreatedAt(LocalDateTime.now());
        dataset2.setUpdatedAt(LocalDateTime.now());

        datasetRepository.save(dataset1);
        datasetRepository.save(dataset2);
    }

    @Test
    @DisplayName("Should find dataset by ID")
    void findById_success() {
        Optional<Dataset> foundDataset = datasetRepository.findById(dataset1.getId());
        assertThat(foundDataset).isPresent();
        assertThat(foundDataset.get().getName()).isEqualTo("Test Dataset 1");
    }

    @Test
    @DisplayName("Should not find non-existent dataset by ID")
    void findById_notFound() {
        Optional<Dataset> foundDataset = datasetRepository.findById(999L);
        assertThat(foundDataset).isNotPresent();
    }

    @Test
    @DisplayName("Should find dataset by name")
    void findByName_success() {
        Optional<Dataset> foundDataset = datasetRepository.findByName("Test Dataset 2");
        assertThat(foundDataset).isPresent();
        assertThat(foundDataset.get().getId()).isEqualTo(dataset2.getId());
    }

    @Test
    @DisplayName("Should not find dataset by non-existent name")
    void findByName_notFound() {
        Optional<Dataset> foundDataset = datasetRepository.findByName("Non Existent Dataset");
        assertThat(foundDataset).isNotPresent();
    }

    @Test
    @DisplayName("Should check if dataset by name exists")
    void existsByName_true() {
        boolean exists = datasetRepository.existsByName("Test Dataset 1");
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should check if dataset by name does not exist")
    void existsByName_false() {
        boolean exists = datasetRepository.existsByName("Non Existent Dataset");
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should save a new dataset")
    void save_newDataset_success() {
        Dataset newDataset = new Dataset();
        newDataset.setName("New Dataset");
        newDataset.setDescription("A brand new dataset");
        newDataset.setStoragePath("/new/path.txt");
        newDataset.setFileType("TXT");
        newDataset.setSizeBytes(500L);
        newDataset.setNumRows(5);
        newDataset.setNumColumns(1);
        newDataset.setCreatedAt(LocalDateTime.now());
        newDataset.setUpdatedAt(LocalDateTime.now());

        Dataset savedDataset = datasetRepository.save(newDataset);
        assertThat(savedDataset.getId()).isNotNull();
        assertThat(savedDataset.getName()).isEqualTo("New Dataset");
        assertThat(datasetRepository.count()).isEqualTo(3);
    }

    @Test
    @DisplayName("Should update an existing dataset")
    void update_existingDataset_success() {
        Dataset existing = datasetRepository.findByName("Test Dataset 1").get();
        existing.setDescription("Updated description");
        existing.setNumRows(15);

        Dataset updated = datasetRepository.save(existing);
        assertThat(updated.getDescription()).isEqualTo("Updated description");
        assertThat(updated.getNumRows()).isEqualTo(15);
    }

    @Test
    @DisplayName("Should delete a dataset by ID")
    void deleteById_success() {
        Long idToDelete = dataset1.getId();
        datasetRepository.deleteById(idToDelete);
        Optional<Dataset> foundDataset = datasetRepository.findById(idToDelete);
        assertThat(foundDataset).isNotPresent();
        assertThat(datasetRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Should not save dataset with duplicate name")
    void save_duplicateName_failure() {
        Dataset duplicateDataset = new Dataset();
        duplicateDataset.setName("Test Dataset 1"); // Duplicate name
        duplicateDataset.setDescription("Another description");
        duplicateDataset.setStoragePath("/another/path.csv");
        duplicateDataset.setFileType("CSV");
        duplicateDataset.setSizeBytes(100L);
        duplicateDataset.setNumRows(1);
        duplicateDataset.setNumColumns(1);
        duplicateDataset.setCreatedAt(LocalDateTime.now());
        duplicateDataset.setUpdatedAt(LocalDateTime.now());

        assertThrows(DataIntegrityViolationException.class, () -> datasetRepository.save(duplicateDataset));
    }

    @Test
    @DisplayName("Should retrieve all datasets")
    void findAll_success() {
        List<Dataset> datasets = datasetRepository.findAll();
        assertThat(datasets).hasSize(2);
        assertThat(datasets).extracting(Dataset::getName).containsExactlyInAnyOrder("Test Dataset 1", "Test Dataset 2");
    }
}
```
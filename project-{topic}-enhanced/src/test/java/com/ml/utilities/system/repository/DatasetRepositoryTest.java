```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.Dataset;
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

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class DatasetRepositoryTest {

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
    private DatasetRepository datasetRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private TestEntityManager entityManager;

    private Dataset dataset1;
    private User testUser;

    @BeforeEach
    void setUp() {
        datasetRepository.deleteAll();
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

        dataset1 = new Dataset();
        dataset1.setName("Dataset A");
        dataset1.setVersion("1.0");
        dataset1.setDescription("Description A");
        dataset1.setFormat("CSV");
        dataset1.setCreatedBy(testUser);
        entityManager.persistAndFlush(dataset1);

        Dataset dataset2 = new Dataset();
        dataset2.setName("Dataset B");
        dataset2.setVersion("2.0");
        dataset2.setDescription("Description B");
        dataset2.setFormat("Parquet");
        dataset2.setCreatedBy(testUser);
        entityManager.persistAndFlush(dataset2);
    }

    @Test
    void findByNameAndVersion_Found() {
        Optional<Dataset> foundDataset = datasetRepository.findByNameAndVersion("Dataset A", "1.0");
        assertTrue(foundDataset.isPresent());
        assertEquals("Description A", foundDataset.get().getDescription());
    }

    @Test
    void findByNameAndVersion_NotFound() {
        Optional<Dataset> foundDataset = datasetRepository.findByNameAndVersion("Dataset A", "1.1");
        assertFalse(foundDataset.isPresent());
    }

    @Test
    void existsByNameAndVersion_True() {
        assertTrue(datasetRepository.existsByNameAndVersion("Dataset A", "1.0"));
    }

    @Test
    void existsByNameAndVersion_False() {
        assertFalse(datasetRepository.existsByNameAndVersion("Dataset C", "1.0"));
    }

    @Test
    void findAll_Pagination() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Dataset> datasetPage = datasetRepository.findAll(pageable);

        assertNotNull(datasetPage);
        assertEquals(1, datasetPage.getNumberOfElements());
        assertEquals(2, datasetPage.getTotalElements());
        assertEquals(2, datasetPage.getTotalPages());
    }

    @Test
    void saveAndRetrieveDataset() {
        Dataset newDataset = new Dataset();
        newDataset.setName("New Dataset");
        newDataset.setVersion("1.0");
        newDataset.setDescription("A brand new dataset");
        newDataset.setFormat("JSON");
        newDataset.setCreatedBy(testUser);
        newDataset.setCreatedAt(LocalDateTime.now());
        newDataset.setUpdatedAt(LocalDateTime.now());

        Dataset savedDataset = datasetRepository.save(newDataset);
        entityManager.flush();
        entityManager.clear();

        Optional<Dataset> retrievedDataset = datasetRepository.findById(savedDataset.getId());
        assertTrue(retrievedDataset.isPresent());
        assertEquals("New Dataset", retrievedDataset.get().getName());
        assertEquals(testUser.getId(), retrievedDataset.get().getCreatedBy().getId());
    }

    @Test
    void updateDataset() {
        dataset1.setDescription("Updated description");
        dataset1.setUpdatedAt(LocalDateTime.now());
        Dataset updatedDataset = datasetRepository.save(dataset1);
        entityManager.flush();
        entityManager.clear();

        Optional<Dataset> retrievedDataset = datasetRepository.findById(updatedDataset.getId());
        assertTrue(retrievedDataset.isPresent());
        assertEquals("Updated description", retrievedDataset.get().getDescription());
    }

    @Test
    void deleteDataset() {
        Long idToDelete = dataset1.getId();
        datasetRepository.deleteById(idToDelete);
        entityManager.flush();

        Optional<Dataset> deletedDataset = datasetRepository.findById(idToDelete);
        assertFalse(deletedDataset.isPresent());
    }
}
```
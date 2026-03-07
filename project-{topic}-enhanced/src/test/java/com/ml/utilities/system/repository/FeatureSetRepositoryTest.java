```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.Dataset;
import com.ml.utilities.system.model.FeatureSet;
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
class FeatureSetRepositoryTest {

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
    private FeatureSetRepository featureSetRepository;
    @Autowired
    private DatasetRepository datasetRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private TestEntityManager entityManager;

    private FeatureSet featureSet1;
    private User testUser;
    private Dataset sourceDataset;

    @BeforeEach
    void setUp() {
        featureSetRepository.deleteAll();
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

        sourceDataset = new Dataset();
        sourceDataset.setName("Source Dataset");
        sourceDataset.setVersion("1.0");
        sourceDataset.setCreatedBy(testUser);
        entityManager.persistAndFlush(sourceDataset);

        featureSet1 = new FeatureSet();
        featureSet1.setName("FeatureSet A");
        featureSet1.setVersion("1.0");
        featureSet1.setDescription("Description A");
        featureSet1.setSourceDataset(sourceDataset);
        featureSet1.setCreatedBy(testUser);
        entityManager.persistAndFlush(featureSet1);

        FeatureSet featureSet2 = new FeatureSet();
        featureSet2.setName("FeatureSet B");
        featureSet2.setVersion("2.0");
        featureSet2.setDescription("Description B");
        featureSet2.setCreatedBy(testUser);
        entityManager.persistAndFlush(featureSet2);
    }

    @Test
    void findByNameAndVersion_Found() {
        Optional<FeatureSet> foundFeatureSet = featureSetRepository.findByNameAndVersion("FeatureSet A", "1.0");
        assertTrue(foundFeatureSet.isPresent());
        assertEquals("Description A", foundFeatureSet.get().getDescription());
    }

    @Test
    void findByNameAndVersion_NotFound() {
        Optional<FeatureSet> foundFeatureSet = featureSetRepository.findByNameAndVersion("FeatureSet A", "1.1");
        assertFalse(foundFeatureSet.isPresent());
    }

    @Test
    void existsByNameAndVersion_True() {
        assertTrue(featureSetRepository.existsByNameAndVersion("FeatureSet A", "1.0"));
    }

    @Test
    void existsByNameAndVersion_False() {
        assertFalse(featureSetRepository.existsByNameAndVersion("FeatureSet C", "1.0"));
    }

    @Test
    void findAll_Pagination() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<FeatureSet> featureSetPage = featureSetRepository.findAll(pageable);

        assertNotNull(featureSetPage);
        assertEquals(1, featureSetPage.getNumberOfElements());
        assertEquals(2, featureSetPage.getTotalElements());
        assertEquals(2, featureSetPage.getTotalPages());
    }

    @Test
    void saveAndRetrieveFeatureSet() {
        FeatureSet newFeatureSet = new FeatureSet();
        newFeatureSet.setName("New FeatureSet");
        newFeatureSet.setVersion("1.0");
        newFeatureSet.setDescription("A brand new feature set");
        newFeatureSet.setSourceDataset(sourceDataset);
        newFeatureSet.setCreatedBy(testUser);
        newFeatureSet.setCreatedAt(LocalDateTime.now());
        newFeatureSet.setUpdatedAt(LocalDateTime.now());

        FeatureSet savedFeatureSet = featureSetRepository.save(newFeatureSet);
        entityManager.flush();
        entityManager.clear();

        Optional<FeatureSet> retrievedFeatureSet = featureSetRepository.findById(savedFeatureSet.getId());
        assertTrue(retrievedFeatureSet.isPresent());
        assertEquals("New FeatureSet", retrievedFeatureSet.get().getName());
        assertEquals(sourceDataset.getId(), retrievedFeatureSet.get().getSourceDataset().getId());
        assertEquals(testUser.getId(), retrievedFeatureSet.get().getCreatedBy().getId());
    }

    @Test
    void updateFeatureSet() {
        featureSet1.setDescription("Updated description");
        featureSet1.setUpdatedAt(LocalDateTime.now());
        FeatureSet updatedFeatureSet = featureSetRepository.save(featureSet1);
        entityManager.flush();
        entityManager.clear();

        Optional<FeatureSet> retrievedFeatureSet = featureSetRepository.findById(updatedFeatureSet.getId());
        assertTrue(retrievedFeatureSet.isPresent());
        assertEquals("Updated description", retrievedFeatureSet.get().getDescription());
    }

    @Test
    void deleteFeatureSet() {
        Long idToDelete = featureSet1.getId();
        featureSetRepository.deleteById(idToDelete);
        entityManager.flush();

        Optional<FeatureSet> deletedFeatureSet = featureSetRepository.findById(idToDelete);
        assertFalse(deletedFeatureSet.isPresent());
    }
}
```
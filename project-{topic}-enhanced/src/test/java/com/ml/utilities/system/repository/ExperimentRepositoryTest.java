```java
package com.ml.utilities.system.repository;

import com.ml.utilities.system.model.Experiment;
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
import java.util.Collections;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class ExperimentRepositoryTest {

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
    private ExperimentRepository experimentRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private RoleRepository roleRepository;
    @Autowired
    private TestEntityManager entityManager;

    private Experiment experiment1;
    private Experiment experiment2;
    private User testUser;

    @BeforeEach
    void setUp() {
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

        experiment1 = new Experiment();
        experiment1.setName("Experiment A");
        experiment1.setDescription("Desc A");
        experiment1.setStatus("RUNNING");
        experiment1.setObjective("Obj A");
        experiment1.setCreatedBy(testUser);
        entityManager.persistAndFlush(experiment1);

        experiment2 = new Experiment();
        experiment2.setName("Experiment B");
        experiment2.setDescription("Desc B");
        experiment2.setStatus("COMPLETED");
        experiment2.setObjective("Obj B");
        experiment2.setCreatedBy(testUser);
        entityManager.persistAndFlush(experiment2);
    }

    @Test
    void findByName_Found() {
        Optional<Experiment> foundExperiment = experimentRepository.findByName("Experiment A");
        assertTrue(foundExperiment.isPresent());
        assertEquals("Desc A", foundExperiment.get().getDescription());
    }

    @Test
    void findByName_NotFound() {
        Optional<Experiment> foundExperiment = experimentRepository.findByName("NonExistent Experiment");
        assertFalse(foundExperiment.isPresent());
    }

    @Test
    void existsByName_True() {
        assertTrue(experimentRepository.existsByName("Experiment A"));
    }

    @Test
    void existsByName_False() {
        assertFalse(experimentRepository.existsByName("NonExistent Experiment"));
    }

    @Test
    void findAll_Pagination() {
        Pageable pageable = PageRequest.of(0, 1);
        Page<Experiment> experimentPage = experimentRepository.findAll(pageable);

        assertNotNull(experimentPage);
        assertEquals(1, experimentPage.getNumberOfElements());
        assertEquals(2, experimentPage.getTotalElements());
        assertEquals(2, experimentPage.getTotalPages());
    }

    @Test
    void saveAndRetrieveExperiment() {
        Experiment newExperiment = new Experiment();
        newExperiment.setName("New Experiment");
        newExperiment.setDescription("A brand new experiment");
        newExperiment.setStatus("PENDING");
        newExperiment.setObjective("Test new feature");
        newExperiment.setCreatedBy(testUser);
        newExperiment.setCreatedAt(LocalDateTime.now());
        newExperiment.setUpdatedAt(LocalDateTime.now());

        Experiment savedExperiment = experimentRepository.save(newExperiment);
        entityManager.flush();
        entityManager.clear(); // Detach entity to ensure fresh load

        Optional<Experiment> retrievedExperiment = experimentRepository.findById(savedExperiment.getId());
        assertTrue(retrievedExperiment.isPresent());
        assertEquals("New Experiment", retrievedExperiment.get().getName());
        assertEquals(testUser.getId(), retrievedExperiment.get().getCreatedBy().getId());
    }

    @Test
    void updateExperiment() {
        experiment1.setStatus("COMPLETED");
        experiment1.setEndDate(LocalDateTime.now());
        Experiment updatedExperiment = experimentRepository.save(experiment1);
        entityManager.flush();
        entityManager.clear();

        Optional<Experiment> retrievedExperiment = experimentRepository.findById(updatedExperiment.getId());
        assertTrue(retrievedExperiment.isPresent());
        assertEquals("COMPLETED", retrievedExperiment.get().getStatus());
        assertNotNull(retrievedExperiment.get().getEndDate());
    }

    @Test
    void deleteExperiment() {
        Long idToDelete = experiment1.getId();
        experimentRepository.deleteById(idToDelete);
        entityManager.flush();

        Optional<Experiment> deletedExperiment = experimentRepository.findById(idToDelete);
        assertFalse(deletedExperiment.isPresent());
    }
}
```
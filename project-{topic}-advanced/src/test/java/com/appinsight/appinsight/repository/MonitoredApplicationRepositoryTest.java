package com.appinsight.appinsight.repository;

import com.appinsight.appinsight.model.MonitoredApplication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class MonitoredApplicationRepositoryTest {

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
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop"); // Ensure clean schema for each test run
        registry.add("spring.flyway.enabled", () -> "false"); // Disable Flyway for DataJpaTest as we use create-drop
    }

    @Autowired
    private MonitoredApplicationRepository applicationRepository;

    @Autowired
    private TestEntityManager entityManager;

    private MonitoredApplication app1;

    @BeforeEach
    void setUp() {
        app1 = MonitoredApplication.builder().name("TestApp1").description("Description 1").build();
        entityManager.persistAndFlush(app1); // Persist to get an ID and API key
        entityManager.clear(); // Detach entity for fresh retrieval
    }

    @Test
    @DisplayName("Should find application by name")
    void findByName_shouldReturnApplication_whenFound() {
        Optional<MonitoredApplication> found = applicationRepository.findByName("TestApp1");
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("TestApp1");
    }

    @Test
    @DisplayName("Should not find application by non-existent name")
    void findByName_shouldReturnEmpty_whenNotFound() {
        Optional<MonitoredApplication> found = applicationRepository.findByName("NonExistentApp");
        assertThat(found).isEmpty();
    }

    @Test
    @DisplayName("Should find application by API key")
    void findByApiKey_shouldReturnApplication_whenFound() {
        Optional<MonitoredApplication> found = applicationRepository.findByApiKey(app1.getApiKey());
        assertThat(found).isPresent();
        assertThat(found.get().getApiKey()).isEqualTo(app1.getApiKey());
    }

    @Test
    @DisplayName("Should return true when application name exists")
    void existsByName_shouldReturnTrue_whenExists() {
        boolean exists = applicationRepository.existsByName("TestApp1");
        assertThat(exists).isTrue();
    }

    @Test
    @DisplayName("Should return false when application name does not exist")
    void existsByName_shouldReturnFalse_whenNotExists() {
        boolean exists = applicationRepository.existsByName("AnotherApp");
        assertThat(exists).isFalse();
    }

    @Test
    @DisplayName("Should save and retrieve an application with generated API key")
    void save_shouldPersistAndGenerateApiKey() {
        MonitoredApplication newApp = MonitoredApplication.builder().name("NewApp").description("A brand new app").build();
        MonitoredApplication savedApp = applicationRepository.save(newApp);

        assertThat(savedApp).isNotNull();
        assertThat(savedApp.getId()).isNotNull();
        assertThat(savedApp.getName()).isEqualTo("NewApp");
        assertThat(savedApp.getApiKey()).isNotNull().hasSize(36); // UUID format
    }
}
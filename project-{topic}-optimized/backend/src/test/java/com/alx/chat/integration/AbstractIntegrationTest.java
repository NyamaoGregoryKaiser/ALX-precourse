```java
package com.alx.chat.integration;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base class for all integration tests that require a PostgreSQL database.
 * Uses Testcontainers to spin up a transient database for each test run.
 */
@Testcontainers
public abstract class AbstractIntegrationTest {

    // Define a PostgreSQL container. Testcontainers will manage its lifecycle.
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("test_db")
            .withUsername("test_user")
            .withPassword("test_password");

    /**
     * Dynamically configures Spring Boot properties to connect to the Testcontainers PostgreSQL.
     * This method runs once before all tests in this class.
     *
     * @param registry DynamicPropertyRegistry to add/override properties.
     */
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create"); // Ensure schema is created for tests
        registry.add("spring.flyway.enabled", () -> "true"); // Enable Flyway for tests
        registry.add("spring.flyway.locations", () -> "classpath:/db/migration"); // Use existing migration scripts
        registry.add("jwt.secret", () -> "supersecretkeyforciverylongandsecure"); // Mock JWT secret for tests
        registry.add("jwt.expiration-in-ms", () -> "3600000"); // 1 hour for tests
    }
}
```

### API Tests (Backend - RestAssured)

API tests verify the behavior of the REST endpoints from an external client perspective.
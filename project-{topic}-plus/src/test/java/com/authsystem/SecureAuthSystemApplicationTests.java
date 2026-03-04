package com.authsystem;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Basic smoke test to ensure that the Spring Boot application context loads successfully.
 * This is a fundamental integration test that verifies all beans can be created and
 * wired together without issues.
 *
 * {@code @SpringBootTest} loads the full application context.
 * {@code @ActiveProfiles("test")} activates the "test" profile, allowing for
 * profile-specific configurations (e.g., in-memory H2 database for tests).
 * We will define a minimal test profile in application.yml for H2.
 * For true integration tests with PostgreSQL, Testcontainers will be used.
 */
@SpringBootTest
@ActiveProfiles("test") // Use a test profile for this simple context load test
class SecureAuthSystemApplicationTests {

    /**
     * Verifies that the application context loads successfully.
     * If this test passes, it means Spring Boot can start and all its components
     * (controllers, services, repositories, configurations) are correctly defined.
     */
    @Test
    void contextLoads() {
        // If the application context loads without throwing exceptions, this test passes.
        // No explicit assertions are needed here beyond the successful startup.
    }
}
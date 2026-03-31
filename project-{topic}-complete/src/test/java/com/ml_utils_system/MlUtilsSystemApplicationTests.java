```java
package com.ml_utils_system;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

/**
 * Basic Spring Boot context loading test.
 * Ensures that the application context can load without errors.
 * Uses 'test' profile to enable H2 in-memory database for faster testing.
 */
@SpringBootTest
@ActiveProfiles("test") // Activates a 'test' profile for specific test configurations
class MlUtilsSystemApplicationTests {

    /**
     * Verifies that the Spring Boot application context loads successfully.
     * If the context fails to load, this test will fail.
     */
    @Test
    void contextLoads() {
        // This test will pass if the Spring application context starts successfully.
    }

}
```
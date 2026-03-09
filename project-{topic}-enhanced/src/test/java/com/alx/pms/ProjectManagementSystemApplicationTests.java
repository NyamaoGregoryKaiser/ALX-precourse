```java
package com.alx.pms;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test") // Use a test profile if you have specific test configurations
class ProjectManagementSystemApplicationTests {

    @Test
    void contextLoads() {
        // This test ensures that the Spring application context loads successfully.
        // If there are any configuration issues, this test will fail.
    }
}
```
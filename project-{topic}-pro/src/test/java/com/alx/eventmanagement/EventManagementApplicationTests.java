```java
package com.alx.eventmanagement;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test") // Use a 'test' profile if you have one, to override configurations like database
class EventManagementApplicationTests {

    @Test
    void contextLoads() {
        // This test simply verifies that the Spring application context loads successfully.
        // It's a basic sanity check for the application's configuration.
    }

}
```
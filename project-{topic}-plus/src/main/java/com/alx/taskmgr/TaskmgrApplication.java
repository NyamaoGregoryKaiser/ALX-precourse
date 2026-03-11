```java
package com.alx.taskmgr;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

/**
 * Main entry point for the Task Manager Pro Spring Boot application.
 * This class configures and runs the application.
 *
 * It also includes OpenAPI definitions for Swagger UI, enabling
 * rich API documentation generation.
 *
 * @EnableCaching activates Spring's cache management capabilities.
 */
@SpringBootApplication
@EnableCaching
@OpenAPIDefinition(
        info = @Info(
                title = "Task Manager Pro API",
                version = "1.0",
                description = "Comprehensive API for managing tasks, users, and categories.",
                contact = @Contact(name = "ALX Software Engineering", email = "info@alx.com"),
                license = @License(name = "Apache 2.0", url = "http://www.apache.org/licenses/LICENSE-2.0.html")
        )
)
public class TaskmgrApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskmgrApplication.class, args);
    }

}
```
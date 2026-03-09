```java
package com.alx.pms;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching // Enable caching for the application
@OpenAPIDefinition(
        info = @Info(
                title = "Project Management System API",
                version = "1.0",
                description = "API documentation for the ALX Project Management System."
        )
)
@SecurityScheme(
        name = "BearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT authentication using Bearer token"
)
public class ProjectManagementSystemApplication {

    public static void main(String[] args) {
        SpringApplication.run(ProjectManagementSystemApplication.class, args);
    }

}
```
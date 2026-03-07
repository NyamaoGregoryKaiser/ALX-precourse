```java
package com.ml.utilities.system.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "ML Utilities System API",
                version = "1.0.0",
                description = "API documentation for managing ML experiments, models, datasets, and feature sets.",
                contact = @Contact(
                        name = "ALX SE Team",
                        email = "contact@alx.com"
                ),
                license = @License(
                        name = "Apache 2.0",
                        url = "https://www.apache.org/licenses/LICENSE-2.0.html"
                )
        ),
        servers = {
                @Server(url = "http://localhost:8080", description = "Local Development Server"),
                @Server(url = "https://your-production-url.com", description = "Production Server")
        },
        security = {
                @SecurityRequirement(name = "Bearer Authentication") // Reference the security scheme
        }
)
@SecurityScheme(
        name = "Bearer Authentication", // Name of the security scheme
        type = SecuritySchemeType.HTTP,
        bearerFormat = "JWT",
        scheme = "bearer",
        description = "Provide a valid JWT token in the 'Authorization' header to access protected endpoints."
)
public class OpenApiConfig {
    // This class is primarily for annotation-driven OpenAPI configuration.
    // The actual Swagger UI and API docs are enabled by springdoc-openapi-starter-webmvc-ui dependency.
}
```
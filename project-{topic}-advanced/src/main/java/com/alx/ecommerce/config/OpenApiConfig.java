```java
package com.alx.ecommerce.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
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
                contact = @Contact(
                        name = "ALX SE Team",
                        email = "contact@alx-ecommerce.com",
                        url = "https://www.alx-ecommerce.com"
                ),
                title = "ALX E-commerce System API",
                version = "1.0",
                description = "Comprehensive API documentation for the ALX E-commerce System.",
                license = @License(
                        name = "Apache 2.0",
                        url = "http://www.apache.org/licenses/LICENSE-2.0.html"
                ),
                termsOfService = "https://www.alx-ecommerce.com/terms"
        ),
        servers = {
                @Server(
                        description = "Local Development Server",
                        url = "http://localhost:8080/api/v1"
                ),
                @Server(
                        description = "Production Server",
                        url = "https://api.alx-ecommerce.com/api/v1"
                )
        },
        security = {
                @SecurityRequirement(
                        name = "bearerAuth"
                )
        }
)
@SecurityScheme(
        name = "bearerAuth",
        description = "JWT authentication token",
        scheme = "bearer",
        type = SecuritySchemeType.HTTP,
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER
)
public class OpenApiConfig {
    // This class is primarily for annotation-based OpenAPI configuration.
    // No additional beans or methods are typically needed here unless custom logic is required.
}
```
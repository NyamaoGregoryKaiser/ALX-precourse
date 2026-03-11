package com.alx.ecommerce.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "ALX E-commerce API",
                version = "1.0",
                description = "Comprehensive API documentation for the ALX E-commerce Solution.",
                contact = @Contact(
                        name = "ALX SE Team",
                        email = "support@alx-ecommerce.com"
                )
        ),
        servers = {
                @Server(url = "http://localhost:8080/api", description = "Local Development Server"),
                @Server(url = "https://your-production-url/api", description = "Production Server")
        },
        security = {
                @SecurityRequirement(name = "bearerAuth")
        }
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        description = "JWT authentication token"
)
public class OpenApiConfig {
    // Configuration for OpenAPI (Swagger) documentation
    // Access at http://localhost:8080/swagger-ui.html
}
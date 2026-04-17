package com.alx.ecommerce.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI (Swagger) configuration for API documentation.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "ALX E-commerce System API",
                version = "1.0",
                description = "Comprehensive REST API for an E-commerce application, built with Spring Boot.",
                contact = @Contact(
                        name = "ALX Team",
                        email = "contact@alx-ecommerce.com",
                        url = "https://www.alx-ecommerce.com"
                ),
                license = @License(
                        name = "Apache 2.0",
                        url = "http://www.apache.org/licenses/LICENSE-2.0.html"
                )
        ),
        servers = {
                @Server(url = "http://localhost:8080", description = "Local Development Server"),
                @Server(url = "https://your-production-url.com", description = "Production Server")
        }
)
@SecurityScheme(
        name = "Bearer Authentication",
        type = SecuritySchemeType.HTTP,
        bearerFormat = "JWT",
        scheme = "bearer",
        description = "JWT authentication token. Add 'Bearer ' prefix."
)
public class OpenApiConfig {
}
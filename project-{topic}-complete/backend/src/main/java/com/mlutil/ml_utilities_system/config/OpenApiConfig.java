package com.mlutil.ml_utilities_system.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "ML Utilities System API",
                version = "1.0",
                description = "API documentation for the Machine Learning Utilities System. " +
                              "Provides functionalities for dataset management, data preprocessing, and model evaluation.",
                contact = @Contact(
                        name = "ALX Software Engineering Team",
                        email = "contact@alx.com"
                ),
                license = @License(
                        name = "Apache 2.0",
                        url = "http://www.apache.org/licenses/LICENSE-2.0.html"
                )
        ),
        servers = {
                @Server(
                        url = "http://localhost:8080",
                        description = "Development Server"
                ),
                @Server(
                        url = "http://production.mlutil.com",
                        description = "Production Server"
                )
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
    // This class configures OpenAPI (Swagger UI) for the project.
    // Access Swagger UI at http://localhost:8080/swagger-ui.html
}
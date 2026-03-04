package com.authsystem.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for OpenAPI (Swagger UI) documentation.
 * This class customizes the appearance and behavior of the Swagger UI,
 * including adding security definitions for JWT authentication.
 *
 * Access the Swagger UI at: http://localhost:8080/swagger-ui.html
 * Access the OpenAPI JSON at: http://localhost:8080/v3/api-docs
 */
@Configuration
public class OpenApiConfig {

    /**
     * Customizes the OpenAPI definition for the application.
     * This includes:
     * - General API information (title, description, version, contact, license).
     * - Security scheme definition for JWT (Bearer token).
     * - Global security requirement to apply JWT to all endpoints by default,
     *   which can be overridden with {@code @SecurityRequirements(value = {})} on specific endpoints.
     *
     * @return A customized {@link OpenAPI} object.
     */
    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "bearerAuth";
        return new OpenAPI()
                .info(new Info().title("Secure Auth System API")
                        .description("Comprehensive REST API for User Authentication and Authorization in an enterprise-grade application.")
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("ALX Software Engineering")
                                .email("alx@alx.com")
                                .url("https://www.alxafrica.com"))
                        .license(new License().name("Apache 2.0").url("http://springdoc.org")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Provide the JWT token in the format 'Bearer [token]' to access secured endpoints."))
                );
    }
}
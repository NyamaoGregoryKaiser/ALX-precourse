package com.alx.auth.system.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for OpenAPI (Swagger UI).
 * This class sets up the basic information for the API documentation and configures
 * JWT security for Swagger UI, allowing users to authenticate directly within the UI.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Defines the custom OpenAPI bean.
     *
     * @return An OpenAPI object with custom information and security schemes.
     */
    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "bearerAuth"; // Name for the security scheme

        return new OpenAPI()
                .info(new Info()
                        .title("ALX Authentication System API")
                        .version("1.0")
                        .description("Comprehensive, production-ready Authentication System API documentation."))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName)) // Add security globally
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName,
                                new SecurityScheme()
                                        .name(securitySchemeName)
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("Provide a valid JWT token in the format: `Bearer <token>`")
                        )
                );
    }
}
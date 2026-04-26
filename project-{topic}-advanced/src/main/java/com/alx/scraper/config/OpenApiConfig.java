package com.alx.scraper.config;

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
 * Configuration for Springdoc OpenAPI (Swagger UI).
 * This class customizes the generated API documentation,
 * including application information and security scheme for JWT.
 *
 * ALX Focus: Essential for good API design and maintainability.
 * Provides clear, interactive documentation for API consumers,
 * integrating JWT authentication directly into the Swagger UI for testing.
 */
@Configuration
public class OpenApiConfig {

    /**
     * Configures the OpenAPI bean with custom metadata and security schemes.
     *
     * @return A customized {@link OpenAPI} object.
     */
    @Bean
    public OpenAPI customOpenAPI() {
        final String securitySchemeName = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title("ALX Scraper API")
                        .version("1.0")
                        .description("API documentation for the ALX Production-Ready Web Scraper system.")
                        .contact(new Contact()
                                .name("ALX Software Engineering")
                                .email("info@alx.com")
                                .url("https://www.alxafrica.com"))
                        .license(new License()
                                .name("Apache 2.0")
                                .url("http://www.apache.org/licenses/LICENSE-2.0.html")))
                .addSecurityItem(new SecurityRequirement().addList(securitySchemeName))
                .components(new Components()
                        .addSecuritySchemes(securitySchemeName, new SecurityScheme()
                                .name(securitySchemeName)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }
}
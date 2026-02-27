```java
package com.alx.webscraper.auth.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration for Springdoc OpenAPI (Swagger UI).
 * Defines API metadata and security schemes for JWT authentication.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("WebScraperX API")
                        .version("1.0")
                        .description("Comprehensive Web Scraping Tools System with Spring Boot")
                        .contact(new Contact()
                                .name("ALX Software Engineering")
                                .email("contact@alx-se.com")
                                .url("https://www.alxafrica.com/software-engineering/")
                        )
                        .license(new License()
                                .name("MIT License")
                                .url("https://opensource.org/licenses/MIT")
                        )
                )
                .components(new Components()
                        .addSecuritySchemes("bearerAuth", new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT authentication token")
                        )
                );
    }
}
```
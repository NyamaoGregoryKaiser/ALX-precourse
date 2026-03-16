```java
package com.alx.scrapineer;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // Enables Spring's scheduled task execution
@EnableCaching // Enables Spring's caching abstraction
@OpenAPIDefinition(
        info = @Info(
                title = "Scrapineer API",
                version = "1.0",
                description = "API for the comprehensive Web Scraping Tools System.",
                contact = @Contact(name = "ALX SE Team", email = "info@alx.com"),
                license = @License(name = "Apache 2.0", url = "https://www.apache.org/licenses/LICENSE-2.0")
        ),
        servers = {
                @Server(url = "http://localhost:8080", description = "Local Development Server"),
                @Server(url = "https://api.scrapineer.com", description = "Production Server (Example)")
        }
)
public class ScrapineerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ScrapineerApplication.class, args);
    }

}
```
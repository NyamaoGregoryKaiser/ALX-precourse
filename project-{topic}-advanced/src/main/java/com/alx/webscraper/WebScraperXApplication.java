```java
package com.alx.webscraper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // Enables Spring's scheduled task execution
@EnableCaching    // Enables Spring's caching abstraction
public class WebScraperXApplication {

    public static void main(String[] args) {
        SpringApplication.run(WebScraperXApplication.class, args);
        System.out.println("WebScraperX Application Started!");
    }

}
```
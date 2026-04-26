package com.alx.scraper;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main entry point for the AlxScraper Spring Boot application.
 *
 * This class initializes the Spring application context, enabling various features:
 * - `@SpringBootApplication`: Marks this as a Spring Boot application, enabling auto-configuration,
 *   component scanning, and configuration property loading.
 * - `@EnableScheduling`: Activates Spring's support for scheduled tasks, allowing methods
 *   annotated with `@Scheduled` to run automatically at specified intervals. This is crucial
 *   for running web scraping jobs periodically.
 * - `@EnableCaching`: Activates Spring's cache management capabilities. This allows for
 *   methods to be cached using annotations like `@Cacheable`, `@CachePut`, and `@CacheEvict`,
 *   improving performance by reducing redundant computations or database calls.
 *
 * ALX Focus: Demonstrates fundamental Spring Boot setup, modularity through annotations,
 * and enabling key enterprise features like scheduling and caching at the application level.
 */
@SpringBootApplication
@EnableScheduling
@EnableCaching
public class AlxScraperApplication {

    /**
     * The main method that starts the Spring Boot application.
     *
     * @param args Command line arguments passed to the application.
     */
    public static void main(String[] args) {
        SpringApplication.run(AlxScraperApplication.class, args);
    }

}
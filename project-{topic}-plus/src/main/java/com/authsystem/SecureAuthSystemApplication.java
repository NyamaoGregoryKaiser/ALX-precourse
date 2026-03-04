package com.authsystem;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Main entry point for the Secure Authentication System application.
 *
 * This class uses Spring Boot's {@code @SpringBootApplication} annotation,
 * which is a convenience annotation that adds:
 * - {@code @Configuration}: Tags the class as a source of bean definitions for the application context.
 * - {@code @EnableAutoConfiguration}: Tells Spring Boot to start adding beans based on classpath settings,
 *   other beans, and various property settings.
 * - {@code @ComponentScan}: Tells Spring to look for other components, configurations, and services in the
 *   {@code com.authsystem} package, allowing it to find controllers, services, repositories, etc.
 *
 * Additionally, {@code @EnableCaching} enables Spring's annotation-driven cache management,
 * allowing methods to be cached using annotations like {@code @Cacheable}.
 * {@code @EnableScheduling} enables Spring's scheduled task execution capability, although not directly
 * used in this specific version, it's good practice for enterprise applications for potential future use
 * (e.g., clearing expired tokens, sending scheduled reports).
 */
@SpringBootApplication
@EnableCaching // Enable Spring's cache abstraction
@EnableScheduling // Enable Spring's scheduling capabilities
public class SecureAuthSystemApplication {

    /**
     * The main method which serves as the entry point for the Spring Boot application.
     * It uses {@link SpringApplication#run(Class, String...)} to bootstrap and
     * launch a Spring application from a Java main method.
     *
     * @param args Command line arguments passed to the application.
     */
    public static void main(String[] args) {
        SpringApplication.run(SecureAuthSystemApplication.class, args);
        System.out.println("SecureAuthSystemApplication started successfully!"); // Simple confirmation
    }
}
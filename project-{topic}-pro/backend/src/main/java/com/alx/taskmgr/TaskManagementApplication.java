package com.alx.taskmgr;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * Main entry point for the Spring Boot Task Management Application.
 * - @SpringBootApplication: Combines @Configuration, @EnableAutoConfiguration, and @ComponentScan.
 * - @EnableCaching: Activates Spring's cache management capabilities.
 * - @EnableJpaAuditing: Enables JPA auditing for automatic creation and modification timestamping.
 */
@SpringBootApplication
@EnableCaching
@EnableJpaAuditing // Enables automatic population of @CreatedDate, @LastModifiedDate etc.
public class TaskManagementApplication {

    public static void main(String[] args) {
        SpringApplication.run(TaskManagementApplication.class, args);
    }

}
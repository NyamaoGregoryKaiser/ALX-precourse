package com.alx.auth.system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

/**
 * Main entry point for the ALX Authentication System Spring Boot application.
 * This class initializes and runs the entire application.
 *
 * @EnableSpringBootApplication: Meta-annotation that pulls in Spring Boot auto-configuration,
 * component scanning and configuration properties.
 * @EnableCaching: Enables Spring's annotation-driven cache management capabilities.
 * @EnableAspectJAutoProxy: Enables support for @AspectJ-style aspects with AspectJ auto-proxying.
 * This is useful for features like method-level security or custom aspect-based logging/metrics,
 * though not strictly used for rate limiting in this example (which uses an interceptor).
 */
@SpringBootApplication
@EnableCaching
@EnableAspectJAutoProxy(proxyTargetClass = true) // Important for proxying classes, not just interfaces
public class AuthenticationSystemApplication {

	public static void main(String[] args) {
		SpringApplication.run(AuthenticationSystemApplication.class, args);
	}

}
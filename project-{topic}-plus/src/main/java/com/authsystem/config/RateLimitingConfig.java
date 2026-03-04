package com.authsystem.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * WebMvcConfigurer to register custom interceptors, specifically the {@link RateLimitInterceptor}.
 * This ensures that the rate limiting logic is applied to incoming HTTP requests.
 */
@Configuration
@RequiredArgsConstructor
public class RateLimitingConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    /**
     * Adds the {@link RateLimitInterceptor} to the Spring MVC interceptor registry.
     * The interceptor will be applied to all requests matching the specified patterns.
     *
     * For authentication, it's typically applied to login and registration endpoints
     * to prevent brute-force attacks.
     *
     * @param registry The {@link InterceptorRegistry} to add interceptors to.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/auth/login", "/api/auth/register");
    }
}
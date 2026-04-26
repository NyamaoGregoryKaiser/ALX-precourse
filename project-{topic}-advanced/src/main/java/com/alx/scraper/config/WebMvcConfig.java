package com.alx.scraper.config;

import com.alx.scraper.middleware.RateLimitingInterceptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Configuration for Spring MVC, specifically for adding custom interceptors.
 *
 * ALX Focus: Integrating custom middleware (like rate limiting) into the
 * Spring MVC request processing pipeline.
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Autowired
    private RateLimitingInterceptor rateLimitingInterceptor;

    /**
     * Adds the {@link RateLimitingInterceptor} to the registry,
     * applying it to all incoming requests to the API endpoints.
     *
     * @param registry The {@link InterceptorRegistry} to add interceptors to.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Apply rate limiting to all API endpoints
        registry.addInterceptor(rateLimitingInterceptor).addPathPatterns("/api/**");
    }
}
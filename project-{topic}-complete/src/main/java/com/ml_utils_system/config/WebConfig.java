```java
package com.ml_utils_system.config;

import com.ml_utils_system.filter.RateLimitFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Collections;

/**
 * Web configuration class to define CORS policies and register custom filters.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${mlutils.cors.allowedOrigins}")
    private String allowedOrigins;

    /**
     * Configures Cross-Origin Resource Sharing (CORS) for the application.
     * Allows frontend applications running on different origins to access the backend.
     *
     * @param registry The CorsRegistry to configure CORS mappings.
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // Apply CORS to all /api endpoints
                .allowedOrigins(allowedOrigins.split(",")) // Configurable allowed origins
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Allowed HTTP methods
                .allowedHeaders("*") // Allow all headers
                .allowCredentials(true) // Allow sending credentials (cookies, auth headers)
                .maxAge(3600); // Max age of the CORS pre-flight request
    }

    /**
     * Registers the {@link RateLimitFilter} to apply rate limiting to API endpoints.
     * The filter is applied to all paths under /api/.
     *
     * @return A FilterRegistrationBean for the RateLimitFilter.
     */
    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration() {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new RateLimitFilter());
        registration.setUrlPatterns(Collections.singletonList("/api/*")); // Apply to all /api endpoints
        registration.setOrder(1); // Set a higher order to execute early in the filter chain
        return registration;
    }
}
```
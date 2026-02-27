```java
package com.alx.webscraper.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web configuration class to register custom interceptors.
 * Here, we register the RateLimitingInterceptor.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitingInterceptor rateLimitingInterceptor;

    @Autowired
    public WebConfig(RateLimitingInterceptor rateLimitingInterceptor) {
        this.rateLimitingInterceptor = rateLimitingInterceptor;
    }

    /**
     * Adds interceptors to the registry.
     * The RateLimitingInterceptor is applied to all API endpoints.
     * @param registry InterceptorRegistry to which interceptors are added.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Apply rate limiting to all /api/v1 endpoints
        registry.addInterceptor(rateLimitingInterceptor).addPathPatterns("/api/v1/**");
    }
}
```
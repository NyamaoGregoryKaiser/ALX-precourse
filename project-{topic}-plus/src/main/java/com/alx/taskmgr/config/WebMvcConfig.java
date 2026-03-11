```java
package com.alx.taskmgr.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC configuration.
 * This class is used to configure interceptors and static resource handlers.
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    /**
     * Adds interceptors to the registry.
     * Here, the RateLimitInterceptor is added to apply rate limiting to all API endpoints.
     *
     * @param registry The InterceptorRegistry to add interceptors to.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/v1/**") // Apply rate limiting to all API endpoints
                .excludePathPatterns("/api/v1/auth/**"); // Exclude authentication endpoints
    }

    /**
     * Adds resource handlers for static content.
     * This allows serving static files (like frontend HTML, JS, CSS) from specific locations.
     *
     * @param registry The ResourceHandlerRegistry to add handlers to.
     */
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/frontend/**")
                .addResourceLocations("classpath:/frontend/"); // Serves files from `src/main/resources/frontend/`
        // Also ensure Swagger UI resources are served
        registry.addResourceHandler("/swagger-ui/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/swagger-ui/");
        registry.addResourceHandler("/v3/api-docs/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/springdoc-openapi-ui/");
    }
}
```
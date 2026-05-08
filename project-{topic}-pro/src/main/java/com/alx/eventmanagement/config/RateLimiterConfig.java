```java
package com.alx.eventmanagement.config;

import io.github.resilience4j.ratelimiter.RateLimiterConfig;
import io.github.resilience4j.ratelimiter.RateLimiterRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class RateLimiterConfig {

    @Bean
    public RateLimiterRegistry rateLimiterRegistry() {
        RateLimiterConfig config = RateLimiterConfig.custom()
                .limitRefreshPeriod(Duration.ofSeconds(60)) // Allow requests every 60 seconds
                .limitForPeriod(5) // Max 5 requests per 60 seconds
                .timeoutDuration(Duration.ofSeconds(0)) // Don't block, immediately throw error
                .build();

        // Create a RateLimiterRegistry with a default configuration
        return RateLimiterRegistry.of(config);
    }
}
```
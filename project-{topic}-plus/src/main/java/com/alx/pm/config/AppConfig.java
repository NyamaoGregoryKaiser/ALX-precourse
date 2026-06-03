```java
package com.alx.pm.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class AppConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("products", "categories");
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(10, TimeUnit.MINUTES) // Items expire after 10 minutes
                .maximumSize(500) // Max 500 items in cache
                .recordStats()); // Enable statistics for monitoring
        return cacheManager;
    }

    /**
     * Configures a rate limiting bucket for the application.
     * This example limits to 10 requests per second.
     *
     * In a real-world scenario, you might have different buckets for different
     * API endpoints, per-user limits, or use a distributed rate limiter (e.g., Redis-backed).
     */
    @Bean
    public Bucket rateLimitingBucket() {
        Bandwidth limit = Bandwidth.simple(10, Duration.ofSeconds(1)); // 10 requests per second
        return Bucket4j.builder().addLimit(limit).build();
    }
}
```
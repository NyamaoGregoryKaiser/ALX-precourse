```java
package com.alx.webscraper.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for the caching layer using Caffeine.
 * Enables Spring's caching abstraction and defines cache managers.
 */
@Configuration
public class CacheConfig {

    /**
     * Defines a CaffeineCacheManager.
     * This manager will be used by Spring's `@Cacheable`, `@CachePut`, `@CacheEvict` annotations.
     * @return Configured CacheManager.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("scrapingTasks");
        cacheManager.setCaffeine(caffeineConfig());
        return cacheManager;
    }

    /**
     * Configures the Caffeine cache builder properties.
     *
     * @return Caffeine builder with desired settings.
     */
    public Caffeine<Object, Object> caffeineConfig() {
        return Caffeine.newBuilder()
                .expireAfterWrite(60, TimeUnit.SECONDS) // Items expire 60 seconds after being written
                .maximumSize(500); // Maximum of 500 items in the cache
                // .recordStats() // Enable to collect cache statistics (can be useful for monitoring)
    }
}
```
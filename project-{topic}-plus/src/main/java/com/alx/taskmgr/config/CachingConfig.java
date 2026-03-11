```java
package com.alx.taskmgr.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for the caching layer using Caffeine.
 * Enables Spring's caching annotations (@Cacheable, @CachePut, @CacheEvict).
 * Defines cache managers for different cache needs, e.g., 'categoriesCache'.
 */
@Configuration
@EnableCaching // Make sure this is also on the main application class for full effect
public class CachingConfig {

    /**
     * Configures and provides a CaffeineCacheManager bean.
     * This manager will handle caches defined by Spring's caching annotations.
     * It allows defining specific cache configurations per cache name.
     *
     * @return A CaffeineCacheManager instance.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        // Define cache for categories with a specific expiration policy
        cacheManager.setCaffeine(caffeineCacheBuilder());
        cacheManager.setCacheNames(java.util.Arrays.asList("categoriesCache", "tasksCache")); // Define cache names
        return cacheManager;
    }

    /**
     * Builds a Caffeine cache configuration.
     * This specifies the common properties for caches, such as initial capacity,
     * maximum size, and expiration policy.
     *
     * @return A Caffeine builder instance configured with desired properties.
     */
    @Bean
    public Caffeine<Object, Object> caffeineCacheBuilder() {
        return Caffeine.newBuilder()
                .initialCapacity(100) // Initial capacity of the cache
                .maximumSize(1000)    // Maximum number of entries in the cache
                .expireAfterAccess(10, TimeUnit.MINUTES) // Entries expire 10 minutes after last access
                .weakKeys()           // Allow keys to be garbage collected when there are no other strong references to them
                .recordStats();       // Record cache statistics (hits, misses, etc.)
    }
}
```
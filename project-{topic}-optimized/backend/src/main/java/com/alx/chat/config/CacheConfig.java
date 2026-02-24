```java
package com.alx.chat.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for Caffeine Caching.
 * Defines cache managers and cache specifications.
 */
@Configuration
public class CacheConfig {

    /**
     * Configures the Caffeine cache manager.
     * @return CacheManager instance configured with Caffeine.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(caffeineCacheBuilder());
        return cacheManager;
    }

    /**
     * Defines the Caffeine cache builder properties.
     * Configures cache size, expiration, and weak keys.
     * @return Caffeine builder instance.
     */
    @Bean
    public Caffeine<Object, Object> caffeineCacheBuilder() {
        return Caffeine.newBuilder()
                .initialCapacity(100) // Initial capacity of the cache
                .maximumSize(500) // Maximum number of entries the cache can hold
                .expireAfterAccess(10, TimeUnit.MINUTES) // Entries expire after 10 minutes of not being accessed
                .weakKeys(); // Allow keys to be garbage collected if there are no other strong references
    }
}
```
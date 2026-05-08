```java
package com.alx.eventmanagement.config;

import com.github.ben_manes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("eventCategories", "popularEvents");
        // Customize Caffeine per cache or use a global spec from application.yml
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(10, TimeUnit.MINUTES) // Items expire 10 minutes after writing
                .maximumSize(100)); // Max 100 items in cache
        return cacheManager;
    }

    // You can define specific Caffeine builders for different caches if needed
    @Bean
    public Caffeine<Object, Object> eventCategoriesCacheBuilder() {
        return Caffeine.newBuilder()
                .expireAfterAccess(60, TimeUnit.MINUTES) // Expire 60 minutes after last access
                .maximumSize(500); // Max 500 categories
    }
}
```
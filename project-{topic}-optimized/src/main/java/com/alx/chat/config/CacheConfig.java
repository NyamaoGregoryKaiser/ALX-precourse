```java
package com.alx.chat.config;

import com.github.ben_manes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public Caffeine<Object, Object> caffeineCacheBuilder() {
        // Configure default cache settings
        return Caffeine.newBuilder()
                .maximumSize(1000) // Max 1000 entries
                .expireAfterWrite(5, TimeUnit.MINUTES) // Expire after 5 minutes of write access
                .recordStats(); // Enable statistics for monitoring
    }

    @Bean
    public CacheManager cacheManager(Caffeine<Object, Object> caffeineCacheBuilder) {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(caffeineCacheBuilder);
        // You can define specific caches with different settings here if needed
        // For example:
        // cacheManager.registerCustomCache("users", Caffeine.newBuilder().expireAfterAccess(1, TimeUnit.HOURS).build());
        return cacheManager;
    }
}
```
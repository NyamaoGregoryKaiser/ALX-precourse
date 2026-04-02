```java
package com.alx.cms.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        cacheManager.setCaches(Arrays.asList(
                new CaffeineCache("contents", Caffeine.newBuilder()
                        .maximumSize(1000)
                        .expireAfterWrite(60, TimeUnit.SECONDS)
                        .build()),
                new CaffeineCache("contentById", Caffeine.newBuilder()
                        .maximumSize(500)
                        .expireAfterWrite(30, TimeUnit.SECONDS)
                        .build()),
                new CaffeineCache("contentBySlug", Caffeine.newBuilder()
                        .maximumSize(500)
                        .expireAfterWrite(30, TimeUnit.SECONDS)
                        .build()),
                new CaffeineCache("categories", Caffeine.newBuilder()
                        .maximumSize(100)
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .build()),
                new CaffeineCache("tags", Caffeine.newBuilder()
                        .maximumSize(200)
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .build()),
                new CaffeineCache("users", Caffeine.newBuilder() // Cache user details for security or lookup
                        .maximumSize(500)
                        .expireAfterWrite(1, TimeUnit.MINUTES)
                        .build())
                // Add more caches as needed
        ));
        return cacheManager;
    }
}
```
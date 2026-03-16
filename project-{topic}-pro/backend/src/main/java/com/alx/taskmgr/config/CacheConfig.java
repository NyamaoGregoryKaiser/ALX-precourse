package com.alx.taskmgr.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for Spring's Caching abstraction using Caffeine as the cache provider.
 */
@Configuration
public class CacheConfig {

    /**
     * Configures and provides a CaffeineCacheManager.
     * Defines default cache settings such as expiration time and maximum size.
     * @return The configured CacheManager.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(10, TimeUnit.MINUTES) // Items expire 10 minutes after being written
                .maximumSize(1000) // Maximum of 1000 items in the cache
                .recordStats()); // Record statistics for monitoring
        return cacheManager;
    }
}
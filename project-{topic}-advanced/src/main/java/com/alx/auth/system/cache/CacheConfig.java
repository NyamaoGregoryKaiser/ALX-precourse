package com.alx.auth.system.cache;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration class for setting up Caffeine as the cache manager.
 * Caffeine is a high-performance, in-memory caching library.
 *
 * This configuration defines default cache settings for various caches
 * used throughout the application, such as user roles.
 */
@Configuration
public class CacheConfig {

    /**
     * Defines the Spring CacheManager to use Caffeine.
     *
     * @return A CaffeineCacheManager instance configured with default cache settings.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        // Configure default settings for all caches managed by this manager
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(10, TimeUnit.MINUTES) // Items expire 10 minutes after being written
                .maximumSize(500) // Maximum of 500 items in the cache
                .recordStats()); // Record statistics for monitoring cache performance
        return cacheManager;
    }
}
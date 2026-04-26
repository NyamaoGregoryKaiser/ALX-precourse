package com.alx.scraper.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for the caching layer using Caffeine.
 *
 * ALX Focus: Implementing a caching strategy to improve application performance
 * and reduce load on the database or external services. Demonstrates
 * configuring cache eviction policies (time-based).
 */
@Configuration
public class CacheConfig {

    /**
     * Configures a Caffeine-based cache manager.
     * This bean will be used by Spring's `@Cacheable`, `@CachePut`, `@CacheEvict` annotations.
     *
     * @return A {@link CacheManager} instance configured with Caffeine caches.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        // Configure default cache settings
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(10, TimeUnit.MINUTES) // Items expire 10 minutes after being written
                .maximumSize(500)); // Maximum of 500 entries in the cache
        // You can define specific caches with different settings if needed:
        // cacheManager.registerCustomCache("mySpecificCache", Caffeine.newBuilder()
        //         .expireAfterWrite(5, TimeUnit.MINUTES)
        //         .maximumSize(100)
        //         .build());
        return cacheManager;
    }
}
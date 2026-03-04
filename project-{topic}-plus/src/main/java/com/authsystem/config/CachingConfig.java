package com.authsystem.config;

import com.github.ben_manes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for the caching layer using Caffeine.
 *
 * Caffeine is a high-performance, near optimal caching library providing a
 * Java 8-based replacement for Guava Cache. It's an excellent choice for
 * in-memory caching in Spring applications.
 *
 * This configuration defines the {@link CacheManager} and specifies properties
 * for different caches, such as time-to-live (TTL) and maximum size.
 */
@Configuration
public class CachingConfig {

    public static final String USERS_CACHE = "users";
    public static final String ROLES_CACHE = "roles";

    /**
     * Configures and provides a {@link CacheManager} for the application.
     * Uses {@link CaffeineCacheManager} to integrate Caffeine with Spring's caching abstraction.
     *
     * Defines two specific caches:
     * - "users": for caching user details, with a 5-minute expiry after last access and a maximum of 1000 entries.
     * - "roles": for caching role details, with a 10-minute expiry after last access and a maximum of 100 entries.
     *
     * These caches can then be used with Spring's {@code @Cacheable}, {@code @CacheEvict}, etc. annotations.
     *
     * @return A configured {@link CacheManager} instance.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();

        // Configure 'users' cache: expire after 5 minutes of inactivity, max 1000 entries
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterAccess(5, TimeUnit.MINUTES)
                .maximumSize(1000));

        // You can configure different settings for different caches
        // For example, an 'roles' cache with different expiry
        cacheManager.setCacheSpecification(USERS_CACHE + ":expireAfterAccess=5m,maximumSize=1000," +
                ROLES_CACHE + ":expireAfterAccess=10m,maximumSize=100");

        return cacheManager;
    }
}
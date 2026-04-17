package com.alx.ecommerce.config;

import com.github.ben_manes.caffeine.cache.Caffeine;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCache;
import org.springframework.cache.support.SimpleCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.concurrent.TimeUnit;

import static com.alx.ecommerce.util.AppConstants.*;

/**
 * Configuration for Spring's caching abstraction using Caffeine.
 */
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        SimpleCacheManager cacheManager = new SimpleCacheManager();
        cacheManager.setCaches(Arrays.asList(
                // Cache for all products, expires after 10 minutes
                new CaffeineCache(PRODUCTS_CACHE, Caffeine.newBuilder()
                        .expireAfterWrite(10, TimeUnit.MINUTES)
                        .maximumSize(500)
                        .build()),
                // Cache for single product by ID, expires after 5 minutes
                new CaffeineCache(PRODUCT_BY_ID_CACHE, Caffeine.newBuilder()
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .maximumSize(1000)
                        .build()),
                // Cache for all categories, expires after 15 minutes
                new CaffeineCache(CATEGORIES_CACHE, Caffeine.newBuilder()
                        .expireAfterWrite(15, TimeUnit.MINUTES)
                        .maximumSize(100)
                        .build()),
                // Cache for single category by ID, expires after 10 minutes
                new CaffeineCache(CATEGORY_BY_ID_CACHE, Caffeine.newBuilder()
                        .expireAfterWrite(10, TimeUnit.MINUTES)
                        .maximumSize(200)
                        .build()),
                // Cache for all users, expires after 10 minutes
                new CaffeineCache(USERS_CACHE, Caffeine.newBuilder()
                        .expireAfterWrite(10, TimeUnit.MINUTES)
                        .maximumSize(500)
                        .build()),
                // Cache for single user by ID, expires after 5 minutes
                new CaffeineCache(USER_BY_ID_CACHE, Caffeine.newBuilder()
                        .expireAfterWrite(5, TimeUnit.MINUTES)
                        .maximumSize(1000)
                        .build())
        ));
        return cacheManager;
    }
}
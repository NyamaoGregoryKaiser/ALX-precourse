```java
package com.ml.utilities.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.ehcache.config.builders.CacheConfigurationBuilder;
import org.ehcache.config.builders.ResourcePoolsBuilder;
import org.ehcache.jsr107.EhcacheCachingProvider;
import javax.cache.Caching;
import javax.cache.spi.CachingProvider;
import java.time.Duration;

import static org.ehcache.config.builders.ExpiryPolicyBuilder.timeToLiveExpiration;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager ehCacheManager() {
        // Configure Ehcache programmatically
        CachingProvider cachingProvider = Caching.getCachingProvider("org.ehcache.jsr107.EhcacheCachingProvider");
        javax.cache.CacheManager cacheManager = cachingProvider.get               CacheManager();

        // Define cache configuration for 'models'
        org.ehcache.config.CacheConfiguration<Long, Object> modelCacheConfig = CacheConfigurationBuilder.newCacheConfigurationBuilder(
                        Long.class, Object.class,
                        ResourcePoolsBuilder.heap(100)) // Max 100 entries in heap
                .withExpiry(timeToLiveExpiration(Duration.ofMinutes(10))) // Cache entries expire after 10 minutes
                .build();
        cacheManager.createCache("models", EhcacheCachingProvider.build(modelCacheConfig));

        // Define cache configuration for 'modelVersions'
        org.ehcache.config.CacheConfiguration<Long, Object> modelVersionCacheConfig = CacheConfigurationBuilder.newCacheConfigurationBuilder(
                        Long.class, Object.class,
                        ResourcePoolsBuilder.heap(200)) // Max 200 entries in heap
                .withExpiry(timeToLiveExpiration(Duration.ofMinutes(5))) // Cache entries expire after 5 minutes
                .build();
        cacheManager.createCache("modelVersions", EhcacheCachingProvider.build(modelVersionCacheConfig));

        // For simplicity, using Spring's JCacheCacheManager to wrap the Ehcache javax.cache.CacheManager
        return new org.springframework.cache.jcache.JCacheCacheManager(cacheManager);
    }
}
```
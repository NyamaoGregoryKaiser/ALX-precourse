```java
package com.alx.vizflow.config;

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
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("users", "datasets", "visualizations"); // Define cache names
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .expireAfterWrite(10, TimeUnit.MINUTES) // Cache entries expire after 10 minutes
                .maximumSize(1000)); // Max 1000 entries
        return cacheManager;
    }
}
```
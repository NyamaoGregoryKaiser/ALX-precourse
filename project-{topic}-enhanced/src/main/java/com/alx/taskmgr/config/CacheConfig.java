```java
package com.alx.taskmgr.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CacheConfig {

    // You can use ConcurrentMapCacheManager for simple local caching
    // or configure a JCacheCacheManager (ehcache.xml) as done in application.yml
    // This bean is shown as an alternative for basic setups if ehcache.xml wasn't used.
    // In this project, ehcache.xml and spring.cache.jcache.config in application.yml
    // is the primary way to configure Ehcache.
    /*
    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("users", "tasks", "categories");
    }
    */
}
```
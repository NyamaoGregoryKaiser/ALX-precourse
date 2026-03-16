```java
package com.alx.scrapineer.common.config;

import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
public class AppConfig {

    @Value("${rate-limiter.bucket-capacity:10}")
    private long bucketCapacity;

    @Value("${rate-limiter.refill-tokens:5}")
    private long refillTokens;

    @Value("${rate-limiter.refill-period-seconds:60}")
    private long refillPeriodSeconds;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Configures the ThreadPoolTaskScheduler for Spring's @Scheduled tasks.
     * This provides a dedicated pool for scheduled jobs, preventing them from
     * blocking the main application threads.
     * @return ThreadPoolTaskScheduler instance.
     */
    @Bean
    public ThreadPoolTaskScheduler taskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(5); // Number of threads for scheduled tasks
        scheduler.setThreadNamePrefix("scrapineer-scheduler-");
        scheduler.initialize();
        return scheduler;
    }

    /**
     * Configures Caffeine as the cache manager.
     * @return CacheManager instance.
     */
    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(caffeineBuilder());
        return cacheManager;
    }

    /**
     * Customizes Caffeine cache properties.
     * @return Caffeine builder instance.
     */
    Caffeine<Object, Object> caffeineBuilder() {
        return Caffeine.newBuilder()
                .initialCapacity(100)
                .maximumSize(500)
                .expireAfterAccess(10, TimeUnit.MINUTES) // Items expire 10 minutes after last access
                .recordStats(); // Enable cache statistics
    }

    /**
     * Configures a rate limiting bucket using Bucket4j.
     * This bucket will allow `bucketCapacity` requests initially,
     * and then refill `refillTokens` every `refillPeriodSeconds`.
     * This specific bean is intended for global or a default rate limit.
     * For per-user/per-IP rate limiting, a map of buckets would be more appropriate.
     * @return A Bucket4j Bucket instance.
     */
    @Bean
    public Bucket rateLimitingBucket() {
        Refill refill = Refill.intervally(refillTokens, Duration.ofSeconds(refillPeriodSeconds));
        Bandwidth limit = Bandwidth.classic(bucketCapacity, refill);
        return Bucket.builder().addLimit(limit).build();
    }
}
```
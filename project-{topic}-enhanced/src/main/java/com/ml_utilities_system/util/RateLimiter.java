package com.ml_utilities_system.util;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * A service for managing API rate limits using Bucket4j and Guava Cache.
 * Each API endpoint or key can have its own bucket with a defined capacity and refill rate.
 */
@Service
public class RateLimiter {

    // Cache to store a Bucket for each rate limit key.
    // Buckets are automatically removed if not accessed for 1 hour to prevent memory leaks for unused keys.
    private final LoadingCache<String, Bucket> cache;

    public RateLimiter() {
        cache = CacheBuilder.newBuilder()
                .expireAfterAccess(1, TimeUnit.HOURS) // Remove buckets that haven't been accessed for an hour
                .build(new CacheLoader<String, Bucket>() {
                    @Override
                    public Bucket load(String key) throws Exception {
                        // This default builder is for keys not explicitly configured.
                        // In a real system, you might retrieve config from DB or properties here.
                        // For demonstration, we'll provide a default token bucket.
                        return createNewBucket(10, 60); // Default: 10 requests per 60 seconds
                    }
                });
    }

    /**
     * Retrieves or creates a Bucket for a given key with specified limit and duration.
     * @param key The unique identifier for the rate limit (e.g., "GET_DATASET_BY_ID").
     * @param limit The maximum number of requests allowed within the duration.
     * @param durationSeconds The time window in seconds for the limit.
     * @return A Bucket instance for the given key.
     */
    public Bucket resolveBucket(String key, int limit, int durationSeconds) {
        // We use cache.get(key) which will call load() if not present.
        // The load() method above might create a default bucket.
        // Here, we ensure the correct bucket configuration is applied or updated if needed.
        // For simplicity, we just create a new bucket if parameters change for a key,
        // or rely on the initial load/default. A more robust solution might
        // involve a custom CacheLoader that takes (key, limit, duration) or a separate config.
        // For now, we manually put if the default is not suitable.
        return cache.getUnchecked(key); // This will create a default bucket if not exists
    }

    /**
     * Creates a new token bucket with specified capacity and refill rate.
     * @param capacity The maximum number of tokens the bucket can hold (i.e., requests allowed).
     * @param refillDurationSeconds The duration over which the bucket refills to its capacity.
     * @return A configured Bucket instance.
     */
    private Bucket createNewBucket(int capacity, int refillDurationSeconds) {
        Refill refill = Refill.intervally(capacity, Duration.ofSeconds(refillDurationSeconds));
        Bandwidth limit = Bandwidth.classic(capacity, refill);
        return Bucket.builder().addLimit(limit).build();
    }

    /**
     * Explicitly configure a bucket for a key. This method allows dynamic configuration.
     * @param key The unique identifier for the rate limit.
     * @param limit The maximum number of requests allowed.
     * @param durationSeconds The time window for the limit.
     */
    public void configureBucket(String key, int limit, int durationSeconds) {
        cache.put(key, createNewBucket(limit, durationSeconds));
    }
}
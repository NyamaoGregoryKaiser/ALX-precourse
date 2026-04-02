```java
package com.alx.cms.common.middleware;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

/**
 * Basic in-memory rate limiting interceptor using Bucket4j.
 * For production, consider a distributed solution with Redis.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    // Configure the rate limit: 10 requests per minute
    private final Bandwidth limit = Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1)));

    // Cache to store a Bucket for each IP address
    private final LoadingCache<String, Bucket> buckets = CacheBuilder.newBuilder()
            .expireAfterWrite(1, TimeUnit.HOURS) // Remove buckets for inactive IPs
            .build(new CacheLoader<String, Bucket>() {
                @Override
                public Bucket load(String key) {
                    return Bucket4j.builder().addLimit(limit).build();
                }
            });

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String ipAddress = getClientIpAddress(request);
        try {
            Bucket bucket = buckets.get(ipAddress);
            if (bucket.tryConsume(1)) {
                // Request allowed
                return true;
            } else {
                // Request blocked
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Too many requests");
                response.setHeader("Retry-After", String.valueOf(TimeUnit.MINUTES.toSeconds(1))); // Indicate when to retry
                return false;
            }
        } catch (ExecutionException e) {
            // Handle cache loading errors, e.g., log them
            response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.getWriter().write("Internal server error during rate limiting.");
            return false;
        }
    }

    private String getClientIpAddress(HttpServletRequest request) {
        // Check for common proxy headers first
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            return xForwardedForHeader.split(",")[0].trim(); // Take the first IP in the list
        }
        return request.getRemoteAddr(); // Fallback to direct connection IP
    }
}
```
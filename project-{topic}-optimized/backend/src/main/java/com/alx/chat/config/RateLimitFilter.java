```java
package com.alx.chat.config;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Global rate limiting filter using Bucket4j and Guava Cache.
 * Limits the number of requests per IP address over a certain period.
 */
@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    // Define the rate limit: 10 requests per 1 minute
    private final Bandwidth limit = Bandwidth.classic(10, Refill.intervally(10, Duration.ofMinutes(1)));

    // Cache to store a Bucket for each IP address
    private final LoadingCache<String, Bucket> caches = CacheBuilder.newBuilder()
            .maximumSize(1000) // Max 1000 IP addresses in cache
            .expireAfterAccess(1, TimeUnit.HOURS) // Remove entry if not accessed for 1 hour
            .build(new CacheLoader<>() {
                @Override
                public Bucket load(String key) {
                    // Create a new bucket for a new IP address
                    return Bucket4j.builder().addLimit(limit).build();
                }
            });

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Exempt WebSocket connections from rate limiting (handled by other means or implicitly by connection duration)
        if (request.getRequestURI().startsWith("/websocket")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ipAddress = getClientIpAddress(request);
        Bucket bucket = caches.getUnchecked(ipAddress); // Get or create bucket for IP

        // Try to consume one token from the bucket
        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response); // Request allowed
        } else {
            log.warn("Rate limit exceeded for IP: {}", ipAddress);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Too many requests");
            response.getWriter().flush();
        }
    }

    /**
     * Helper method to extract client IP address, considering proxies.
     * @param request HttpServletRequest
     * @return Client IP address.
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            return xForwardedForHeader.split(",")[0].trim(); // Take the first IP in the list
        }
        return request.getRemoteAddr();
    }
}
```
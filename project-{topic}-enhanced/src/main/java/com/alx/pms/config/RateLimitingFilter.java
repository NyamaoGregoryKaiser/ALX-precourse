```java
package com.alx.pms.config;

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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final LoadingCache<String, Bucket> buckets;

    public RateLimitingFilter() {
        // Define rate limits: 10 requests per minute
        Refill refill = Refill.greedy(10, Duration.ofMinutes(1));
        Bandwidth limit = Bandwidth.classic(10, refill);

        this.buckets = CacheBuilder.newBuilder()
                .expireAfterWrite(1, TimeUnit.HOURS) // Remove buckets for inactive IPs
                .build(new CacheLoader<>() {
                    @Override
                    public Bucket load(String key) {
                        return Bucket4j.builder().addLimit(limit).build();
                    }
                });
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Exclude Swagger UI and Actuator endpoints from rate limiting for easier testing/monitoring
        String requestUri = request.getRequestURI();
        if (requestUri.startsWith("/swagger-ui") || requestUri.startsWith("/v3/api-docs") || requestUri.startsWith("/actuator")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ipAddress = getClientIpAddress(request);
        try {
            Bucket bucket = buckets.get(ipAddress);
            if (bucket.tryConsume(1)) {
                filterChain.doFilter(request, response);
            } else {
                log.warn("Rate limit exceeded for IP: {}", ipAddress);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Too many requests. Please try again later.");
                response.setHeader("Retry-After", String.valueOf(Duration.ofMinutes(1).toSeconds()));
            }
        } catch (ExecutionException e) {
            log.error("Error retrieving rate limit bucket for IP {}: {}", ipAddress, e.getMessage());
            response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.getWriter().write("Internal server error during rate limiting.");
        }
    }

    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedForHeader = request.getHeader("X-Forwarded-For");
        if (xForwardedForHeader != null && !xForwardedForHeader.isEmpty()) {
            return xForwardedForHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```
```java
package com.ml.utilities.system.config;

import com.google.common.util.concurrent.RateLimiter;
import com.ml.utilities.system.exception.RateLimitExceededException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * A Spring Web Filter for global rate limiting based on IP address.
 * Uses Guava's RateLimiter for token bucket algorithm.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE) // Ensure this filter runs before other security filters
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final boolean rateLimitEnabled;
    private final RateLimiter rateLimiter;

    public RateLimitFilter(
            @Value("${app.rate-limit.enabled:true}") boolean rateLimitEnabled,
            @Value("${app.rate-limit.requests-per-second:5}") double requestsPerSecond) {
        this.rateLimitEnabled = rateLimitEnabled;
        this.rateLimiter = RateLimiter.create(requestsPerSecond); // Create a rate limiter
        log.info("Rate Limiting: enabled={}, permitsPerSecond={}", rateLimitEnabled, requestsPerSecond);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        if (!rateLimitEnabled || isExempt(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        // Try to acquire a token from the rate limiter
        // acquire() blocks until a token is available. tryAcquire() does not block.
        // For a global filter, tryAcquire with a timeout is more appropriate to avoid blocking all requests.
        // Or simply throw an exception if a token isn't immediately available.
        if (!rateLimiter.tryAcquire()) {
            log.warn("Rate limit exceeded for request from IP: {}", request.getRemoteAddr());
            response.setStatus(429); // Too Many Requests
            response.getWriter().write("{\"message\": \"Too many requests. Please try again later.\"}");
            response.setContentType("application/json");
            throw new RateLimitExceededException("Rate limit exceeded. Please try again later.");
        }

        filterChain.doFilter(request, response);
    }

    private boolean isExempt(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Exempt Swagger UI, API docs, and Actuator endpoints from rate limiting
        return path.startsWith("/swagger-ui/") ||
               path.startsWith("/v3/api-docs") ||
               path.startsWith("/actuator/") ||
               path.equals("/") || // Frontend index.html
               path.equals("/index.html") || // Frontend index.html
               path.equals("/script.js") || // Frontend script.js
               path.startsWith("/api/auth/"); // Auth endpoints might need different rate limiting, or be exempt if handled elsewhere.
                                             // For this example, we exempt them from the global filter.
    }
}
```
```java
package com.alx.chat.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A simple in-memory rate limiting filter.
 * For production, consider using Redis for distributed rate limiting or a dedicated library like Bucket4j.
 * This implementation allows 5 requests per 10 seconds per IP address.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Long> lastRequestTime = new ConcurrentHashMap<>();
    private final Map<String, Integer> requestCounts = new ConcurrentHashMap<>();
    private final int MAX_REQUESTS = 5; // Max requests allowed
    private final long TIME_WINDOW_MILLIS = 10_000; // 10 seconds

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String clientIp = request.getRemoteAddr(); // Get client IP address

        // Clean up old entries
        lastRequestTime.entrySet().removeIf(entry ->
                Instant.now().toEpochMilli() - entry.getValue() > TIME_WINDOW_MILLIS);
        requestCounts.keySet().retainAll(lastRequestTime.keySet()); // Keep counts only for active IPs

        long currentTime = Instant.now().toEpochMilli();
        long lastTime = lastRequestTime.getOrDefault(clientIp, 0L);
        int currentCount = requestCounts.getOrDefault(clientIp, 0);

        if (currentTime - lastTime > TIME_WINDOW_MILLIS) {
            // New window, reset count
            lastRequestTime.put(clientIp, currentTime);
            requestCounts.put(clientIp, 1);
            filterChain.doFilter(request, response);
        } else {
            // Same window
            if (currentCount < MAX_REQUESTS) {
                requestCounts.put(clientIp, currentCount + 1);
                filterChain.doFilter(request, response);
            } else {
                // Rate limit exceeded
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Too Many Requests. Please try again after some time.");
                response.setHeader("Retry-After", String.valueOf((lastTime + TIME_WINDOW_MILLIS - currentTime) / 1000));
            }
        }
    }
}
```
```java
package com.ml_utils_system.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Simple in-memory rate limiting filter.
 * Limits requests per IP address to a configurable rate.
 * THIS IS FOR DEMONSTRATION PURPOSES. For production, consider distributed rate limiting
 * solutions like Redis, Nginx, or a dedicated rate limiting service.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_MINUTE = 60; // Max requests allowed per IP per minute
    private static final long TIME_WINDOW_MILLIS = 60 * 1000; // 1 minute in milliseconds

    // Stores <IP Address, <Timestamp of last request, Request Count within current window>>
    private final Map<String, Map<Long, Integer>> requestCounts = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String clientIp = getClientIp(request);
        long currentTime = System.currentTimeMillis();

        requestCounts.compute(clientIp, (ip, counts) -> {
            if (counts == null) {
                // First request from this IP
                Map<Long, Integer> newCounts = new ConcurrentHashMap<>();
                newCounts.put(currentTime, 1);
                return newCounts;
            } else {
                // Remove expired entries (older than TIME_WINDOW_MILLIS)
                counts.entrySet().removeIf(entry -> (currentTime - entry.getKey()) > TIME_WINDOW_MILLIS);

                // Add current request
                counts.merge(currentTime, 1, Integer::sum);
                return counts;
            }
        });

        // Sum requests within the current window
        int totalRequestsInWindow = requestCounts.get(clientIp).values().stream().mapToInt(Integer::intValue).sum();

        if (totalRequestsInWindow > MAX_REQUESTS_PER_MINUTE) {
            logger.warn("Rate limit exceeded for IP: {}", clientIp);
            sendRateLimitExceededResponse(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Extracts the client's IP address from the request.
     * Considers common headers for proxies (X-Forwarded-For).
     *
     * @param request The HttpServletRequest.
     * @return The client IP address.
     */
    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(".")) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    /**
     * Sends a 429 Too Many Requests response to the client.
     *
     * @param response The HttpServletResponse.
     * @throws IOException If an I/O error occurs.
     */
    private void sendRateLimitExceededResponse(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Map<String, Object> errorDetails = new HashMap<>();
        errorDetails.put("timestamp", LocalDateTime.now().toString());
        errorDetails.put("status", HttpStatus.TOO_MANY_REQUESTS.value());
        errorDetails.put("error", "Too Many Requests");
        errorDetails.put("message", "You have exceeded the API rate limit.");

        ObjectMapper objectMapper = new ObjectMapper();
        response.getWriter().write(objectMapper.writeValueAsString(errorDetails));
    }
}
```
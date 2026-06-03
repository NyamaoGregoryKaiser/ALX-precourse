```java
package com.alx.vizflow.filter;

import com.google.common.util.concurrent.RateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A simple IP-based rate limiting filter using Google Guava RateLimiter.
 * This is a basic implementation; for production, consider a distributed rate limiter like Redis-based.
 */
@Component
@Order(1) // Ensure this filter runs before other security filters
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    @Value("${rate.limit.requests-per-second:10}")
    private double requestsPerSecond;

    @Value("${rate.limit.enabled:true}")
    private boolean enabled;

    private final Map<String, RateLimiter> ipRateLimiters = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!enabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        RateLimiter limiter = ipRateLimiters.computeIfAbsent(clientIp, k -> RateLimiter.create(requestsPerSecond));

        if (!limiter.tryAcquire()) {
            log.warn("Rate limit exceeded for IP: {}", clientIp);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Too many requests. Please try again later.");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(".")) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0]; // Return first IP in chain
    }
}
```
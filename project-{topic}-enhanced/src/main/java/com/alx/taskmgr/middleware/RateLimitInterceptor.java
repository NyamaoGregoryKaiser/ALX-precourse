```java
package com.alx.taskmgr.middleware;

import com.google.common.util.concurrent.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * A simple in-memory Rate Limit Interceptor using Guava's RateLimiter.
 * This is suitable for single-instance applications. For distributed systems,
 * a Redis-backed solution or an API Gateway rate limiter would be required.
 * Limits requests based on client IP address.
 */
@Component
@Slf4j
public class RateLimitInterceptor implements HandlerInterceptor {

    // Store a RateLimiter for each client IP
    private final ConcurrentHashMap<String, RateLimiter> ipRateLimiters = new ConcurrentHashMap<>();

    // Maximum 5 requests per 10 seconds per IP
    private final double requestsPerSecond = 0.5; // Equivalent to 5 requests per 10 seconds

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIp(request);
        RateLimiter limiter = ipRateLimiters.computeIfAbsent(clientIp, k -> RateLim limiter.create(requestsPerSecond));

        if (!limiter.tryAcquire()) { // Try to acquire a token, fail immediately if not available
            log.warn("Rate limit exceeded for IP: {}", clientIp);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Too many requests. Please try again later.");
            response.setContentType("text/plain");
            return false;
        }
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(".")) {
            return request.getRemoteAddr();
        }
        // If behind a proxy, X-Forwarded-For might contain a comma-separated list of IPs.
        // The first one is typically the client's original IP.
        return xfHeader.split(",")[0];
    }
}
```
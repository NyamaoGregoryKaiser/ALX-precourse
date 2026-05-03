package com.mlutil.ml_utilities_system.util;

import com.google.common.util.concurrent.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
@Slf4j
public class RateLimiterInterceptor implements HandlerInterceptor {

    // Global rate limiter for unauthenticated requests or general API usage
    private final RateLimiter globalRateLimiter = RateLimiter.create(50.0); // 50 requests per second

    // Per-user rate limiters
    private final ConcurrentMap<String, RateLimiter> userRateLimiters = new ConcurrentHashMap<>();
    private final double userRequestPerSecond = 10.0; // 10 requests per second per user

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        String key;
        RateLimiter currentRateLimiter;

        if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            // Use username for authenticated users
            key = authentication.getName();
            currentRateLimiter = userRateLimiters.computeIfAbsent(key, k -> RateLimiter.create(userRequestPerSecond));
            log.debug("Applying per-user rate limit for user: {}", key);
        } else {
            // Use IP address for unauthenticated requests, or a global limiter
            key = request.getRemoteAddr(); // Or just use globalRateLimiter directly for all unauthenticated
            currentRateLimiter = userRateLimiters.computeIfAbsent(key, k -> RateLimiter.create(5.0)); // 5 req/sec for anonymous IP
            log.debug("Applying IP-based rate limit for anonymous user / IP: {}", key);
        }

        if (!currentRateLimiter.tryAcquire()) {
            log.warn("Rate limit exceeded for key: {}", key);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("Too many requests. Please try again later.");
            response.addHeader("Retry-After", "1"); // Suggest client to retry after 1 second
            return false;
        }

        return true;
    }
}
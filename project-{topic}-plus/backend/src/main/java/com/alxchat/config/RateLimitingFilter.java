package com.alxchat.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();
    private static final int CAPACITY = 10; // 10 requests
    private static final Duration REFILL_DURATION = Duration.ofMinutes(1); // per minute

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.simple(CAPACITY, REFILL_DURATION);
        return Bucket4j.builder().addLimit(limit).build();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Apply rate limiting only to API endpoints, exclude WebSocket and public auth
        String path = request.getRequestURI();
        if (path.startsWith("/api/") && !path.startsWith("/api/auth/")) {
            String ipAddress = request.getRemoteAddr(); // Or user ID after authentication
            Bucket bucket = cache.computeIfAbsent(ipAddress, k -> newBucket());

            if (bucket.tryConsume(1)) {
                filterChain.doFilter(request, response);
            } else {
                log.warn("Rate limit exceeded for IP: {}", ipAddress);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Too many requests. Please try again later.");
                response.setHeader("Retry-After", String.valueOf(REFILL_DURATION.toSeconds()));
            }
        } else {
            filterChain.doFilter(request, response);
        }
    }
}
package com.alx.ecommerce.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A simple rate limiting filter using Bucket4j library.
 * It applies rate limiting based on client IP address.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitFilter.class);

    @Value("${rate-limit.enabled:false}")
    private boolean rateLimitEnabled;

    @Value("${rate-limit.max-requests:10}")
    private int maxRequests;

    @Value("${rate-limit.time-window-seconds:60}")
    private int timeWindowSeconds;

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    private Bucket newBucket(String ip) {
        logger.debug("Creating new rate limit bucket for IP: {}", ip);
        Bandwidth limit = Bandwidth.classic(maxRequests, Refill.intervally(maxRequests, Duration.ofSeconds(timeWindowSeconds)));
        return Bucket.builder().addLimit(limit).build();
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(".")) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        if (!rateLimitEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);
        Bucket bucket = buckets.computeIfAbsent(clientIp, this::newBucket);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            response.addHeader("X-Rate-Limit-Retry-After", String.valueOf(Duration.ofNanos(probe.getNanosToWaitForRefill()).getSeconds()));
            filterChain.doFilter(request, response);
        } else {
            logger.warn("Rate limit exceeded for IP: {}", clientIp);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Content-Type", "application/json");
            response.getWriter().write("{ \"status\": 429, \"error\": \"Too Many Requests\", \"message\": \"You have exceeded the API rate limit.\" }");
        }
    }
}
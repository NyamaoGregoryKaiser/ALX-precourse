package com.authsystem.config;

import com.authsystem.common.exception.ValidationException;
import com.google.common.util.concurrent.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.ConcurrentHashMap;

/**
 * A custom Spring MVC {@link HandlerInterceptor} for implementing basic in-memory rate limiting.
 * This interceptor uses Google Guava's {@link RateLimiter} to control the rate of requests
 * to specific endpoints, typically authentication endpoints like login and registration,
 * to prevent brute-force attacks or excessive load.
 *
 * The rate limiting is applied per IP address.
 */
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitInterceptor.class);

    // Store a RateLimiter instance for each IP address
    private final ConcurrentHashMap<String, RateLimiter> ipRateLimiters = new ConcurrentHashMap<>();

    // Rate limit for authentication endpoints (e.g., 5 requests per second)
    private static final double REQUESTS_PER_SECOND = 5.0;

    /**
     * Intercepts incoming requests before they reach the controller.
     * This method applies rate limiting logic based on the client's IP address.
     *
     * If the rate limit is exceeded for an IP, it throws a {@link ValidationException}
     * with an HTTP 429 Too Many Requests status.
     *
     * @param request The current HttpServletRequest.
     * @param response The current HttpServletResponse.
     * @param handler The handler (controller method) that the request is mapped to.
     * @return {@code true} if the request should proceed, {@code false} otherwise (if rate limit exceeded).
     * @throws Exception If an error occurs during processing.
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIpAddress = getClientIpAddress(request);
        RateLimiter rateLimiter = ipRateLimiters.computeIfAbsent(clientIpAddress,
                ip -> RateLimiter.create(REQUESTS_PER_SECOND));

        // Try to acquire a permit from the rate limiter. If not immediately available, block (or fail fast).
        // For security purposes like brute-force prevention, we might want to fail fast.
        // `tryAcquire()` returns false if a permit cannot be acquired without delay.
        if (!rateLimiter.tryAcquire()) {
            logger.warn("Rate limit exceeded for IP: {}. Request to {} blocked.", clientIpAddress, request.getRequestURI());
            // Throw a custom exception that our GlobalExceptionHandler can catch and format.
            throw new ValidationException("Too many requests. Please try again later.", "rate_limit_exceeded", HttpStatus.TOO_MANY_REQUESTS);
        }

        logger.debug("Request from IP: {} processed. Current rate limit: {} req/s", clientIpAddress, REQUESTS_PER_SECOND);
        return true; // Proceed with the request
    }

    /**
     * Extracts the client's IP address from the HttpServletRequest.
     * Considers various headers that proxies and load balancers might use.
     *
     * @param request The HttpServletRequest.
     * @return The client's IP address as a string.
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String ipAddress = request.getHeader("X-Forwarded-For");
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ipAddress == null || ipAddress.isEmpty() || "unknown".equalsIgnoreCase(ipAddress)) {
            ipAddress = request.getRemoteAddr();
        }
        // In case of multiple IPs, take the first one
        if (ipAddress != null && ipAddress.contains(",")) {
            ipAddress = ipAddress.split(",")[0].trim();
        }
        return ipAddress;
    }
}
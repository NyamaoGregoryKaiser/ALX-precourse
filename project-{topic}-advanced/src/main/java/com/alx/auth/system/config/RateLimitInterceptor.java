package com.alx.auth.system.config;

import com.alx.auth.system.exception.TooManyRequestsException;
import com.google.common.util.concurrent.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Implements a simple in-memory rate limiting mechanism using Google Guava's RateLimiter.
 * This interceptor limits the number of requests per client IP address.
 *
 * It applies a global rate limit of 5 requests per second (rps) to all incoming requests.
 * For a more advanced, distributed rate limiting solution, consider using Spring Cloud Gateway
 * with Redis or a dedicated rate limiting service.
 *
 * @Slf4j: Lombok annotation to generate an SLF4J logger field.
 */
@Configuration
@Slf4j
public class RateLimitInterceptor implements HandlerInterceptor, WebMvcConfigurer {

    // A map to store RateLimiter instances per client IP address.
    // ConcurrentHashMap is used for thread-safe access.
    private final Map<String, RateLimiter> ipRateLimiters = new ConcurrentHashMap<>();
    private final double requestsPerSecond = 5.0; // Global rate limit: 5 requests per second

    /**
     * Pre-handle method called before the actual handler is executed.
     * This method implements the rate limiting logic.
     *
     * @param request The HttpServletRequest.
     * @param response The HttpServletResponse.
     * @param handler The handler (controller method) that will be executed.
     * @return true to proceed with the request, false to stop processing.
     * @throws Exception If an error occurs during pre-handling.
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIp(request); // Get the client's IP address

        // Get or create a RateLimiter for the client IP.
        // computeIfAbsent is thread-safe and ensures only one RateLimiter is created per IP.
        RateLimiter limiter = ipRateLimiters.computeIfAbsent(clientIp, k -> RateLimiter.create(requestsPerSecond));

        // Attempt to acquire a permit. If not acquired within 0 seconds, it means the rate limit is exceeded.
        if (!limiter.tryAcquire(0, TimeUnit.SECONDS)) {
            log.warn("Rate limit exceeded for IP: {}. Request to {} blocked.", clientIp, request.getRequestURI());
            // Set response status to 429 Too Many Requests
            response.setStatus(429);
            response.getWriter().write("Too many requests. Please try again later.");
            response.setHeader("Retry-After", String.valueOf(1)); // Indicate client to retry after 1 second
            throw new TooManyRequestsException("Too many requests from IP: " + clientIp);
        }

        log.debug("Request from IP: {} allowed. Current permits available: {}", clientIp, limiter.getRate());
        return true; // Proceed with the request
    }

    /**
     * Extracts the client IP address from the HttpServletRequest.
     * It checks common headers used by proxies and load balancers first.
     *
     * @param request The HttpServletRequest.
     * @return The client's IP address.
     */
    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || "unknown".equalsIgnoreCase(xfHeader)) {
            return request.getRemoteAddr();
        }
        // If there are multiple IPs in X-Forwarded-For, the first one is usually the client's IP.
        return xfHeader.split(",")[0].trim();
    }

    /**
     * Registers the RateLimitInterceptor with the Spring MVC interceptor registry.
     * This ensures that the interceptor is applied to all incoming requests.
     *
     * @param registry The InterceptorRegistry to add the interceptor to.
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(this);
    }
}
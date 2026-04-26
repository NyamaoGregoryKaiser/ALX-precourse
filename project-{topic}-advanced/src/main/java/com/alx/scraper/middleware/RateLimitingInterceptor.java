package com.alx.scraper.middleware;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

/**
 * Custom Spring MVC interceptor for rate limiting API requests.
 * Uses Google Guava's LoadingCache to store request counts per client IP address.
 *
 * ALX Focus: Implementing a rate-limiting mechanism to protect the application
 * from abuse, denial-of-service attacks, and to manage resource consumption.
 * Demonstrates AOP-like behavior using Spring Interceptors.
 */
@Component
@Slf4j
public class RateLimitingInterceptor implements HandlerInterceptor {

    @Value("${alx.rate-limit.max-requests:100}") // Default 100 requests
    private int MAX_REQUESTS;

    @Value("${alx.rate-limit.time-window-seconds:60}") // Default 60 seconds
    private int TIME_WINDOW_SECONDS;

    // Cache to store request counts per IP address
    private final LoadingCache<String, Integer> requestCounts;

    public RateLimitingInterceptor() {
        requestCounts = CacheBuilder.newBuilder()
                .expireAfterWrite(TIME_WINDOW_SECONDS, TimeUnit.SECONDS) // Reset count after time window
                .build(new CacheLoader<>() {
                    @Override
                    public Integer load(String key) {
                        return 0; // Initialize count for new IP
                    }
                });
    }

    /**
     * Overrides the preHandle method to implement rate limiting logic.
     * This method is called before the controller handler is executed.
     *
     * @param request The {@link HttpServletRequest} object.
     * @param response The {@link HttpServletResponse} object.
     * @param handler The handler (Controller method) that will be executed.
     * @return True to proceed with the request, false to stop processing.
     * @throws Exception If an error occurs during processing.
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIp(request);

        try {
            int requests = requestCounts.get(clientIp);
            if (requests >= MAX_REQUESTS) {
                log.warn("Rate limit exceeded for IP: {}", clientIp);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value()); // 429 Too Many Requests
                response.getWriter().write("Too many requests. Please try again later.");
                return false; // Stop further processing
            }
            requestCounts.put(clientIp, requests + 1); // Increment count
        } catch (ExecutionException e) {
            log.error("Error retrieving request count for IP {}: {}", clientIp, e.getMessage());
            response.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
            response.getWriter().write("Internal server error during rate limiting.");
            return false;
        }

        return true; // Proceed with the request
    }

    /**
     * Retrieves the client's IP address from the request.
     * Considers various HTTP headers for proxies.
     *
     * @param request The {@link HttpServletRequest}.
     * @return The client's IP address.
     */
    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(".")) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0]; // Use the first IP in the list
    }
}
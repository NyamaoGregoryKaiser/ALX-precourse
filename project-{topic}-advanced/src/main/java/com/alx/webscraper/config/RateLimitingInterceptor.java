```java
package com.alx.webscraper.config;

import com.alx.webscraper.exception.CustomRateLimitException;
import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

/**
 * A custom Spring MVC HandlerInterceptor for API rate limiting.
 * It uses a Guava LoadingCache to store request counts per client IP address.
 */
@Component
public class RateLimitingInterceptor implements HandlerInterceptor {

    private static final Logger logger = LoggerFactory.getLogger(RateLimitingInterceptor.class);

    // Max requests allowed within the time window
    private static final int MAX_REQUESTS = 5;
    // Time window for rate limiting
    private static final Duration TIME_WINDOW = Duration.ofSeconds(10);

    // Cache to store request counts for each IP address
    private final LoadingCache<String, Integer> requestCounts;

    public RateLimitingInterceptor() {
        requestCounts = CacheBuilder.newBuilder()
                .expireAfterWrite(TIME_WINDOW.toSeconds(), TimeUnit.SECONDS) // Cache entries expire after the time window
                .build(new CacheLoader<>() {
                    @Override
                    public Integer load(String key) {
                        return 0; // Initialize count to 0 for a new IP
                    }
                });
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIp(request);
        logger.debug("Request from IP: {}", clientIp);

        try {
            int currentRequests = requestCounts.get(clientIp);
            if (currentRequests >= MAX_REQUESTS) {
                logger.warn("Rate limit exceeded for IP: {}", clientIp);
                // Throw custom exception to be handled by GlobalExceptionHandler
                throw new CustomRateLimitException("You have exceeded the API rate limit. Please try again after " + TIME_WINDOW.toSeconds() + " seconds.");
            }
            requestCounts.put(clientIp, currentRequests + 1); // Increment count
        } catch (ExecutionException e) {
            logger.error("Error accessing rate limit cache for IP {}: {}", clientIp, e.getMessage());
            // If cache access fails, allow the request to proceed to avoid blocking legitimate users due to internal error
        }

        return true; // Proceed with the request
    }

    /**
     * Extracts the client's IP address from the HTTP request.
     * Handles proxy headers like X-Forwarded-For.
     * @param request The HttpServletRequest.
     * @return The client's IP address.
     */
    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(".")) {
            return request.getRemoteAddr();
        }
        // Return the first IP in the chain (the original client IP)
        return xfHeader.split(",")[0].trim();
    }
}
```
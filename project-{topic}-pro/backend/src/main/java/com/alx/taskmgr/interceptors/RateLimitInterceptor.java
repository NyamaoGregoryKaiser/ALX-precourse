package com.alx.taskmgr.interceptors;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Bucket4j;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Interceptor for implementing API rate limiting using Bucket4j and Guava Cache.
 * Limits requests based on client IP address.
 */
@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    // Define rate limit: 10 requests per minute
    private static final int CAPACITY = 10;
    private static final Duration REFILL_DURATION = Duration.ofMinutes(1);

    // Cache to store a Bucket for each client IP address
    private final LoadingCache<String, Bucket> buckets;

    public RateLimitInterceptor() {
        // Configure the cache for buckets
        // Entries expire 1 hour after last access, to clean up buckets for inactive IPs
        buckets = CacheBuilder.newBuilder()
                .expireAfterAccess(1, TimeUnit.HOURS)
                .build(new CacheLoader<>() {
                    @Override
                    public Bucket load(String ip) {
                        // Create a new bucket for a new IP with the defined rate limit
                        Bandwidth limit = Bandwidth.simple(CAPACITY, REFILL_DURATION);
                        return Bucket4j.builder().addLimit(limit).build();
                    }
                });
    }

    /**
     * Pre-handle method to apply rate limiting.
     * @param request The current request.
     * @param response The current response.
     * @param handler The handler chosen to execute.
     * @return true if the request can proceed, false otherwise.
     * @throws Exception in case of errors.
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Get client IP address; consider reverse proxies (e.g., NGINX X-Forwarded-For header)
        String clientIp = getClientIp(request);
        Bucket bucket = buckets.get(clientIp); // Get or create bucket for this IP

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1); // Try to consume one token

        if (probe.isConsumed()) {
            // Request allowed, add rate limit headers for client info
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            response.addHeader("X-Rate-Limit-Retry-After-Seconds", "0");
            return true;
        } else {
            // Request denied, set appropriate headers and status
            long waitForRefill = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
            response.addHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(waitForRefill));
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value()); // 429 Too Many Requests
            response.getWriter().write("Too many requests. Please try again after " + waitForRefill + " seconds.");
            return false;
        }
    }

    /**
     * Extracts the client IP address from the request.
     * Handles cases where the application is behind a proxy.
     * @param request The HttpServletRequest.
     * @return The client IP address.
     */
    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(request.getRemoteAddr())) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0]; // In case of multiple proxies, first IP is client
    }
}
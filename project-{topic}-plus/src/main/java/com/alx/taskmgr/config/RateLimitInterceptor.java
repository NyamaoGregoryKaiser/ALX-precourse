```java
package com.alx.taskmgr.config;

import com.alx.taskmgr.exception.TooManyRequestsException;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * A custom Spring MVC interceptor for rate limiting API requests.
 * Uses Bucket4j to manage token buckets for different IP addresses.
 *
 * This interceptor checks if a request can be served based on the
 * configured rate limit before the controller method is executed.
 */
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    // A map to store buckets for different IP addresses
    private final Map<String, Bucket> cache = new ConcurrentHashMap<>();
    private final BucketProvider bucketProvider;

    /**
     * This method is called before the actual handler is executed.
     * It attempts to consume a token from the bucket associated with the client's IP address.
     * If the token is consumed successfully, the request proceeds.
     * Otherwise, a TooManyRequestsException is thrown, preventing further processing.
     *
     * @param request  The current HTTP request.
     * @param response The current HTTP response.
     * @param handler  The handler (Controller method) that will be executed.
     * @return {@code true} if the request should proceed to the controller, {@code false} otherwise.
     * @throws Exception If an error occurs during processing.
     */
    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) throws Exception {
        String remoteAddress = request.getRemoteAddr();
        Bucket bucket = cache.computeIfAbsent(remoteAddress, k -> bucketProvider.getNewBucket());

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            // Set rate limit headers for client-side information
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            response.addHeader("X-Rate-Limit-Retry-After-Seconds", "0");
            return true;
        } else {
            // If consumption failed, set appropriate headers and throw an exception
            long waitForRefill = probe.getNanosToWaitForRefill() / 1_000_000_000;
            response.addHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(waitForRefill));
            throw new TooManyRequestsException("You have exhausted your API request quota. Please try again in " + waitForRefill + " seconds.");
        }
    }
}
```
```java
package com.alx.scrapineer.common.util;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.TimeUnit;

/**
 * Interceptor for rate limiting requests.
 * Uses Bucket4j to manage token buckets.
 */
@Component
@RequiredArgsConstructor
public class RateLimitInterceptor implements HandlerInterceptor {

    private final Bucket rateLimitingBucket; // Injects the global bucket defined in AppConfig

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // For demonstration, a single global bucket is used.
        // In a real application, you might manage per-user or per-IP buckets
        // For example:
        // String apiKey = request.getHeader("X-API-KEY");
        // Bucket userBucket = bucketCache.get(apiKey, () -> createNewBucket());

        ConsumptionProbe probe = rateLimitingBucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            // Request allowed
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            return true;
        } else {
            // Request denied due to rate limit
            long waitForRefill = TimeUnit.NANOSECONDS.toSeconds(probe.getNanosToWaitForRefill());
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.addHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(waitForRefill));
            response.getWriter().write("You have exhausted your API request quota. Please try again in " + waitForRefill + " seconds.");
            return false;
        }
    }
}
```
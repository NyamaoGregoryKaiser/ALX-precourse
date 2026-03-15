package com.ml_utilities_system.interceptor;

import com.ml_utilities_system.exception.RateLimitExceededException;
import com.ml_utilities_system.util.RateLimiter;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.concurrent.TimeUnit;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    @Autowired
    private RateLimiter rateLimiter;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod)) {
            return true;
        }

        HandlerMethod handlerMethod = (HandlerMethod) handler;
        RateLimited rateLimited = handlerMethod.getMethodAnnotation(RateLimited.class);

        if (rateLimited == null) {
            return true; // No @RateLimited annotation, proceed
        }

        String key = rateLimited.key();
        int limit = rateLimited.limit();
        int durationSeconds = rateLimited.durationSeconds();

        // Get or create a bucket for this key
        // Note: For simplicity, the configuration is tied to the annotation.
        // In a production system, `rateLimiter.resolveBucket` might retrieve
        // configurations from a central store, or it might be passed directly.
        // We'll call configureBucket explicitly here to ensure it's set up for these params.
        rateLimiter.configureBucket(key, limit, durationSeconds);
        Bucket bucket = rateLimiter.resolveBucket(key, limit, durationSeconds);

        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
        if (probe.isConsumed()) {
            response.addHeader("X-Rate-Limit-Remaining", String.valueOf(probe.getRemainingTokens()));
            return true;
        } else {
            long waitForRefill = probe.getNanosToWaitForRefill() / 1_000_000_000;
            response.addHeader("X-Rate-Limit-Retry-After-Seconds", String.valueOf(waitForRefill));
            throw new RateLimitExceededException(
                    "You have exhausted your API Request Quota. Try again in " + waitForRefill + " seconds.");
        }
    }
}
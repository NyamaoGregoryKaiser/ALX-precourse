```java
package com.alx.devops.productmanagement.config;

import com.google.common.util.concurrent.RateLimiter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.TimeUnit;

@Component
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    // Allow 5 requests per second for /api/products
    private final RateLimiter productApiRateLimiter = RateLimiter.create(5.0);
    // Allow 2 requests per second for /api/auth
    private final RateLimiter authApiRateLimiter = RateLimiter.create(2.0);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String requestUri = request.getRequestURI();
        RateLimiter activeRateLimiter = null;

        if (requestUri.startsWith("/api/products")) {
            activeRateLimiter = productApiRateLimiter;
        } else if (requestUri.startsWith("/api/auth")) {
            activeRateLimiter = authApiRateLimiter;
        }

        if (activeRateLimiter != null) {
            // Try to acquire a permit without blocking for more than 500ms
            if (!activeRateLimiter.tryAcquire(500, TimeUnit.MILLISECONDS)) {
                log.warn("Rate limit exceeded for URI: {}", requestUri);
                response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
                response.getWriter().write("Too many requests. Please try again later.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
```
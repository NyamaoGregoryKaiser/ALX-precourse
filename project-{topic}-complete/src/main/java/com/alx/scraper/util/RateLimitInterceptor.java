package com.alx.scraper.util;

import com.google.common.cache.CacheBuilder;
import com.google.common.cache.CacheLoader;
import com.google.common.cache.LoadingCache;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * A simple rate limiting interceptor based on IP address.
 * Allows 5 requests per 10 seconds per IP address.
 * For production, consider more advanced solutions like Redis-backed rate limiters.
 */
@Configuration
@Slf4j
public class RateLimitInterceptor implements HandlerInterceptor, WebMvcConfigurer {

    private static final int MAX_REQUESTS = 5;
    private static final int TIME_WINDOW_SECONDS = 10; // seconds

    private final LoadingCache<String, AtomicInteger> requestCounts = CacheBuilder.newBuilder()
            .expireAfterWrite(TIME_WINDOW_SECONDS, TimeUnit.SECONDS)
            .build(new CacheLoader<>() {
                @Override
                public AtomicInteger load(String key) {
                    return new AtomicInteger(0);
                }
            });

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        String clientIp = getClientIp(request);
        AtomicInteger count = requestCounts.get(clientIp);

        if (count.incrementAndGet() > MAX_REQUESTS) {
            log.warn("Rate limit exceeded for IP: {} on path: {}", clientIp, request.getRequestURI());
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.getWriter().write("You have exceeded the API rate limit. Please try again after " + TIME_WINDOW_SECONDS + " seconds.");
            return false;
        }
        log.debug("Request count for IP {}: {}", clientIp, count.get());
        return true;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty() || !xfHeader.contains(".")) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0]; // In case of multiple proxies
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Apply rate limit to all /api/** endpoints
        registry.addInterceptor(this).addPathPatterns("/api/**");
    }
}
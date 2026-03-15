package com.ml_utilities_system.interceptor;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to mark methods that should be rate-limited.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimited {
    String key(); // Unique key for the rate limit (e.g., endpoint name)
    int limit();  // Maximum requests allowed
    int durationSeconds(); // Time window in seconds
}
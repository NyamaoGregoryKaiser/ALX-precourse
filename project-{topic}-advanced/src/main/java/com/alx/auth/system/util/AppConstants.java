package com.alx.auth.system.util;

/**
 * Utility class to hold application-wide constants.
 * This improves code readability and maintainability by centralizing common values.
 */
public final class AppConstants {

    // Prevent instantiation of this utility class
    private AppConstants() {
        throw new IllegalStateException("Utility class");
    }

    // JWT related constants (though some are loaded from application.yml for flexibility)
    public static final String JWT_BEARER_PREFIX = "Bearer ";

    // Role constants
    public static final String ROLE_USER = "USER";
    public static final String ROLE_ADMIN = "ADMIN";

    // API versioning
    public static final String API_V1 = "/api/v1";
}
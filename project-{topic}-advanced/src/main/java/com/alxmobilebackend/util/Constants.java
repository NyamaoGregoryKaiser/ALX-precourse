```java
package com.alxmobilebackend.util;

public final class Constants {

    private Constants() {
        // Private constructor to prevent instantiation
    }

    // Security
    public static final String JWT_SECRET = "ALX_MOBILE_BACKEND_SUPER_SECURE_JWT_SECRET_KEY_FOR_TESTING_ONLY_CHANGE_ME_IN_PRODUCTION";
    public static final long JWT_EXPIRATION_MS = 86400000; // 24 hours
    public static final String TOKEN_PREFIX = "Bearer ";
    public static final String HEADER_STRING = "Authorization";

    // API Paths
    public static final String API_V1_PREFIX = "/api/v1";
    public static final String AUTH_PATH = API_V1_PREFIX + "/auth";
    public static final String USERS_PATH = API_V1_PREFIX + "/users";
    public static final String PRODUCTS_PATH = API_V1_PREFIX + "/products";
    public static final String ORDERS_PATH = API_V1_PREFIX + "/orders";

    // Logging
    public static final String LOG_REQUEST_ID = "requestId";

    // Caching
    public static final String CACHE_PRODUCTS = "products";
    public static final String CACHE_USERS = "users";
    public static final String CACHE_ORDERS = "orders";
    public static final String CACHE_PRODUCT_BY_ID = "productById";
    public static final String CACHE_USER_BY_ID = "userById";

    // Rate Limiting
    public static final int RATE_LIMIT_REQUESTS_PER_MINUTE = 60;
    public static final int RATE_LIMIT_BAN_DURATION_MINUTES = 5;

    // Validation Messages
    public static final String VALID_EMAIL_MESSAGE = "Email should be valid";
    public static final String PASSWORD_SIZE_MESSAGE = "Password must be between 6 and 20 characters";
    public static final String NOT_BLANK_MESSAGE = "Field cannot be blank";
    public static final String POSITIVE_NUMBER_MESSAGE = "Must be a positive number";
    public static final String GREATER_THAN_ZERO_MESSAGE = "Must be greater than zero";
}
```

#### Models (Entities)
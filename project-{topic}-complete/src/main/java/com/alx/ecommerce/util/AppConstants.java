package com.alx.ecommerce.util;

/**
 * Application-wide constants for configuration, messages, etc.
 */
public class AppConstants {

    // JWT Configuration
    public static final String JWT_SECRET = "YourSuperSecretKeyForJWTGenerationAndValidationThatMustBeAtLeast256BitsLongAndStoredSecurely"; // CHANGE THIS IN PRODUCTION
    public static final long JWT_EXPIRATION_MILLISECONDS = 604800000L; // 7 days

    // API Endpoints
    public static final String API_V1_BASE_URL = "/api/v1";

    // Pagination defaults
    public static final String DEFAULT_PAGE_NUMBER = "0";
    public static final String DEFAULT_PAGE_SIZE = "10";
    public static final String DEFAULT_SORT_BY = "id";
    public static final String DEFAULT_SORT_DIRECTION = "asc";

    // User Roles
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_USER = "USER";

    // Cache Names
    public static final String PRODUCTS_CACHE = "products";
    public static final String CATEGORIES_CACHE = "categories";
    public static final String USERS_CACHE = "users";
    public static final String PRODUCT_BY_ID_CACHE = "productById";
    public static final String CATEGORY_BY_ID_CACHE = "categoryById";
    public static final String USER_BY_ID_CACHE = "userById";
}
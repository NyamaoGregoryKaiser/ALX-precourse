#ifndef APP_CONSTANTS_H
#define APP_CONSTANTS_H

#include <string>
#include <vector>

namespace AppConstants {
    // JWT Configuration
    const std::string JWT_SECRET_ENV_VAR = "JWT_SECRET";
    const std::string JWT_ISSUER = "auth-system.com";
    const std::string JWT_AUDIENCE = "users";
    const int JWT_EXPIRATION_SECONDS = 3600; // 1 hour

    // Role Names
    const std::string ROLE_ADMIN = "admin";
    const std::string ROLE_USER = "user";

    // Permission Names (example, can be more granular)
    const std::string PERMISSION_CREATE_USER = "user:create";
    const std::string PERMISSION_READ_USER = "user:read";
    const std::string PERMISSION_UPDATE_USER = "user:update";
    const std::string PERMISSION_DELETE_USER = "user:delete";
    const std::string PERMISSION_MANAGE_ROLES = "role:manage";

    // API Version
    const std::string API_V1_PREFIX = "/api/v1";

    // Rate Limiting
    const int RATE_LIMIT_REQUESTS_PER_WINDOW = 100; // 100 requests
    const int RATE_LIMIT_WINDOW_SECONDS = 60;       // per minute

    // Cache Configuration
    const int CACHE_TTL_SECONDS = 300; // 5 minutes

    // Error Messages
    const std::string ERR_INVALID_CREDENTIALS = "Invalid credentials";
    const std::string ERR_USER_EXISTS = "User already exists";
    const std::string ERR_USER_NOT_FOUND = "User not found";
    const std::string ERR_INVALID_TOKEN = "Invalid or expired token";
    const std::string ERR_UNAUTHORIZED = "Unauthorized access";
    const std::string ERR_FORBIDDEN = "Forbidden access";
    const std::string ERR_INTERNAL_SERVER_ERROR = "Internal server error";
    const std::string ERR_MISSING_FIELDS = "Missing required fields";

    // Success Messages
    const std::string MSG_REGISTER_SUCCESS = "User registered successfully";
    const std::string MSG_LOGIN_SUCCESS = "User logged in successfully";
    const std::string MSG_LOGOUT_SUCCESS = "User logged out successfully";
    const std::string MSG_USER_DELETED = "User deleted successfully";
    const std::string MSG_USER_UPDATED = "User updated successfully";
} // namespace AppConstants

#endif // APP_CONSTANTS_H
```
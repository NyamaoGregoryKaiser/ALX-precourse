```cpp
#include "AuthMiddleware.hpp"
#include "../auth/JwtManager.hpp" // Needs access to JwtManager to verify token
#include "../logger/Logger.hpp"
#include "../utils/AppException.hpp" // For UnauthorizedException

#include "crow.h" // For crow::request, crow::response
#include <string>
#include <memory>

// Extern declaration for JwtManager to be accessible globally
// This is somewhat brittle, a better approach is dependency injection throughout Crow.
// For this single-file app demo, it's manageable.
extern std::unique_ptr<JwtManager> jwtManager;

AuthMiddleware::AuthMiddleware() {
    // Constructor
}

// This function is called for every request before routing.
void AuthMiddleware::before_handle(crow::request& req, crow::response& res, Context& ctx) {
    // Public routes that do not require authentication
    // Add your public routes here, or use a more sophisticated pattern matching
    if (req.url == "/health" ||
        req.url == "/auth/register" ||
        req.url == "/auth/login") {
        return; // Skip authentication for public routes
    }

    std::string authHeader = req.get_header("Authorization");
    if (authHeader.empty()) {
        Logger::warn("AuthMiddleware: No Authorization header provided for protected route: {}", req.url);
        // Using AppException for structured error responses
        throw UnauthorizedException("Authentication token required.");
    }

    // Expecting "Bearer <token>"
    if (authHeader.rfind("Bearer ", 0) != 0) { // Check if string starts with "Bearer "
        Logger::warn("AuthMiddleware: Invalid Authorization header format for route: {}", req.url);
        throw UnauthorizedException("Invalid Authorization header format. Expected 'Bearer <token>'.");
    }

    std::string token = authHeader.substr(7); // Extract token part
    if (token.empty()) {
        Logger::warn("AuthMiddleware: Empty token provided for protected route: {}", req.url);
        throw UnauthorizedException("Authentication token required.");
    }

    int userId = 0;
    std::string userRole;

    if (!jwtManager || !jwtManager->verifyToken(token, userId, userRole)) {
        Logger::warn("AuthMiddleware: Invalid or expired token for route: {}", req.url);
        throw UnauthorizedException("Invalid or expired authentication token.");
    }

    // Set user ID and role in the request context for controllers to use
    ctx.user_id = userId;
    ctx.user_role = userRole;
    Logger::debug("AuthMiddleware: User {} (role: {}) authenticated successfully for route: {}", userId, userRole, req.url);
}

// This function is called after the route handler.
void AuthMiddleware::after_handle(crow::request& req, crow::response& res, Context& ctx) {
    // No specific post-processing for authentication needed here for this example.
    // Can be used for logging, metrics, etc.
}
```
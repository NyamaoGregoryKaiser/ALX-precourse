```cpp
#ifndef MOBILE_BACKEND_AUTH_MIDDLEWARE_H
#define MOBILE_BACKEND_AUTH_MIDDLEWARE_H

#include <crow/crow.h>
#include <string>
#include "jwt_manager.h"
#include "logger.h"

namespace mobile_backend {
namespace utils {

// Crow Middleware for JWT Authentication
// It adds a `user_id` member to the request context if authentication is successful.
struct AuthMiddleware {
    struct context {
        std::optional<int> user_id;
    };

    AuthMiddleware(const JwtManager& jwt_mgr_ref) : jwt_manager(jwt_mgr_ref) {}

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        // Skip authentication for specific public routes (e.g., login, register)
        // This should be managed carefully, e.g., by tagging routes or using path prefixes.
        // For simplicity, let's assume /auth/login and /auth/register are public.
        if (req.url == "/auth/login" || req.url == "/auth/register" || req.url == "/") {
            LOG_DEBUG("AuthMiddleware: Skipping authentication for public route: {}", req.url);
            return;
        }

        const auto& auth_header = req.get_header("Authorization");
        if (auth_header.empty()) {
            LOG_WARN("AuthMiddleware: No Authorization header provided for route: {}", req.url);
            res.code = 401; // Unauthorized
            res.write(crow::json::wvalue({{"error", "Authorization header missing"}}).dump());
            res.end();
            return;
        }

        // Expect "Bearer <token>"
        if (auth_header.rfind("Bearer ", 0) != 0) { // C++20 starts_with, else rfind
            LOG_WARN("AuthMiddleware: Invalid Authorization header format: {}", auth_header);
            res.code = 401;
            res.write(crow::json::wvalue({{"error", "Invalid Authorization header format"}}).dump());
            res.end();
            return;
        }

        std::string token = auth_header.substr(7); // "Bearer ".length() is 7
        std::optional<int> user_id = jwt_manager.verify_token(token);

        if (user_id) {
            ctx.user_id = user_id;
            LOG_DEBUG("AuthMiddleware: Authenticated user_id {} for route: {}", *user_id, req.url);
        } else {
            LOG_WARN("AuthMiddleware: Token verification failed for route: {}", req.url);
            res.code = 401; // Unauthorized
            res.write(crow::json::wvalue({{"error", "Invalid or expired token"}}).dump());
            res.end();
        }
    }

    void after_handle(crow::request& req, crow::response& res, context& ctx) {
        // Not much to do after, but good for cleanup or additional logging
        // LOG_DEBUG("AuthMiddleware: After handle for route: {}", req.url);
    }

private:
    const JwtManager& jwt_manager;
};

} // namespace utils
} // namespace mobile_backend

#endif // MOBILE_BACKEND_AUTH_MIDDLEWARE_H
```
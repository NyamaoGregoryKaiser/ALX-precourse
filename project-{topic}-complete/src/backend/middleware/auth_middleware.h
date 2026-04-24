```cpp
#ifndef ECOMMERCE_AUTH_MIDDLEWARE_H
#define ECOMMERCE_AUTH_MIDDLEWARE_H

#include "crow.h"
#include <string>
#include <optional>
#include <spdlog/spdlog.h>
#include "../utils/jwt_util.h" // For JWT parsing
#include "../middleware/error_middleware.h" // For UnauthorizedException

class AuthMiddleware {
public:
    // UserContext to be stored in crow::request
    struct UserContext {
        bool is_authenticated = false;
        int user_id = 0;
        std::string user_email;
        std::string user_role;
    };

    AuthMiddleware() : jwt_secret_(""), logger_(spdlog::get("ecommerce_logger")) {
        if (!logger_) {
            logger_ = spdlog::stdout_color_mt("auth_middleware_logger");
        }
    }

    // Setter for JWT secret, to be called in main
    void set_jwt_secret(const std::string& secret) {
        jwt_secret_ = secret;
    }

    void before_handle(crow::request& req, crow::response& res, UserContext& ctx) {
        // Skip auth for public routes (e.g., register, login, health check)
        if (req.url == "/api/v1/auth/register" || req.url == "/api/v1/auth/login" || req.url == "/api/v1/health") {
            ctx.is_authenticated = false; // Explicitly set false for public routes
            return;
        }

        std::string auth_header = req.get_header("Authorization");
        if (auth_header.empty() || auth_header.rfind("Bearer ", 0) != 0) {
            logger_->warn("Unauthorized: Missing or invalid Authorization header for {}", req.url);
            // Don't throw here, just mark as unauthenticated.
            // Protected routes will check ctx.is_authenticated and throw.
            ctx.is_authenticated = false;
            return;
        }

        std::string token = auth_header.substr(7); // "Bearer " is 7 chars
        try {
            auto claims = JWTUtil::decode_token(token, jwt_secret_);
            ctx.is_authenticated = true;
            ctx.user_id = std::stoi(claims["user_id"]);
            ctx.user_email = claims["email"];
            ctx.user_role = claims["role"];
            logger_->info("Authenticated user: ID={}, Email={}, Role={} for request {}", ctx.user_id, ctx.user_email, ctx.user_role, req.url);
        } catch (const std::exception& e) {
            logger_->error("JWT validation failed for token: {}. Error: {}", token, e.what());
            // Token invalid, mark as unauthenticated.
            ctx.is_authenticated = false;
            // Optionally, you could set an error on 'res' here if you want to immediately reject.
            // But throwing in the route handler is usually cleaner for specific errors.
        }
    }

    void after_handle(crow::request& req, crow::response& res, UserContext& ctx) {
        // No post-processing needed for authentication
    }

private:
    std::string jwt_secret_;
    std::shared_ptr<spdlog::logger> logger_;
};

#endif // ECOMMERCE_AUTH_MIDDLEWARE_H
```
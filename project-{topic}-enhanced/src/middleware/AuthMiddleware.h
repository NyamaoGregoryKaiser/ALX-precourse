#pragma once

#include "crow.h"
#include "services/AuthService.h"
#include "models/AuthToken.h"
#include "utils/Logger.h"

// Extend crow::request to include authenticated user info
namespace crow {
    struct AuthRequestContext : crow::context<AuthRequestContext> {
        std::optional<AuthToken> user_token;
    };

    class AuthMiddleware {
    public:
        AuthMiddleware() = default;

        std::string get_secret() const { return jwt_secret_; }
        void set_secret(const std::string& secret) { jwt_secret_ = secret; }

        void before_handle(crow::request& req, crow::response& res, AuthRequestContext& ctx) {
            // Public routes or OPTIONS pre-flight requests do not require authentication
            if (req.url == "/api/auth/register" || req.url == "/api/auth/login" || req.method == "OPTIONS") {
                return;
            }

            const auto& auth_header = req.get_header("Authorization");
            if (auth_header.empty() || auth_header.rfind("Bearer ", 0) != 0) {
                LOG_WARN("AuthMiddleware: Missing or malformed Authorization header for URL: {}", req.url);
                res.code = 401; // Unauthorized
                res.write("{\"error\":\"Authorization token missing or invalid format.\"}");
                res.end();
                return;
            }

            std::string token_str = auth_header.substr(7); // "Bearer " is 7 chars
            auto auth_token_opt = auth_service_.decode_jwt(token_str, jwt_secret_);

            if (!auth_token_opt || !auth_token_opt->is_valid()) {
                LOG_WARN("AuthMiddleware: Invalid or expired JWT token for URL: {}", req.url);
                res.code = 401; // Unauthorized
                res.write("{\"error\":\"Invalid or expired authentication token.\"}");
                res.end();
                return;
            }

            ctx.user_token = auth_token_opt.value();
            LOG_DEBUG("AuthMiddleware: User '{}' (ID: {}) authenticated for URL: {}",
                      ctx.user_token->username, ctx.user_token->user_id, req.url);
        }

        void after_handle(crow::request& req, crow::response& res, AuthRequestContext& ctx) {
            // No action needed after handle, context info already used
        }

    private:
        AuthService auth_service_;
        std::string jwt_secret_;
    };
}
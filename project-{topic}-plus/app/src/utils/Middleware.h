#ifndef MIDDLEWARE_H
#define MIDDLEWARE_H

#include <crow.h>
#include "JWT.h"
#include "Logger.h"
#include "ErrorHandler.h"
#include "RateLimiter.h"
#include "../app_config.h"

// Context for storing user info from JWT
struct UserContext {
    long long user_id = 0;
    std::string username;
    std::string role;
    bool is_authenticated = false;
};

// --- 1. Authentication Middleware ---
struct AuthMiddleware {
    struct context {
        UserContext user_context;
    };

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        std::string auth_header = req.get_header("Authorization");
        if (auth_header.empty() || auth_header.length() < 7 || auth_header.substr(0, 6) != "Bearer") {
            // No token or malformed header, continue without auth context
            return;
        }

        std::string token = auth_header.substr(7); // "Bearer ".length() == 7
        try {
            JWT::TokenClaims claims = JWT::verifyToken(token);
            ctx.user_context.user_id = claims.user_id;
            ctx.user_context.username = claims.username;
            ctx.user_context.role = claims.role;
            ctx.user_context.is_authenticated = true;
            LOG_DEBUG("AuthMiddleware: User {} (role: {}) authenticated.", claims.username, claims.role);
        } catch (const UnauthorizedException& e) {
            // Token is invalid/expired, but we don't halt here.
            // A protected route will check `is_authenticated` and throw if false.
            LOG_DEBUG("AuthMiddleware: Token verification failed for request to {}: {}", req.url, e.what());
        } catch (const std::exception& e) {
            LOG_ERROR("AuthMiddleware: Unexpected error during token processing for {}: {}", req.url, e.what());
        }
    }

    void after_handle(crow::request& req, crow::response& res, context& ctx) {
        // No-op for after_handle
    }
};

// --- 2. Authorization Middleware Helpers ---
// Call these in controllers or route handlers after AuthMiddleware has run.
void require_auth(const AuthMiddleware::context& ctx) {
    if (!ctx.user_context.is_authenticated) {
        throw UnauthorizedException("Authentication required to access this resource.");
    }
}

void require_role(const AuthMiddleware::context& ctx, const std::string& required_role) {
    require_auth(ctx); // First, ensure user is authenticated
    if (ctx.user_context.role != required_role) {
        LOG_WARN("Access Denied: User {} (role: {}) tried to access {} role resource.",
                 ctx.user_context.username, ctx.user_context.role, required_role);
        throw ForbiddenException("Access denied. Insufficient privileges.");
    }
}

// --- 3. Logging Middleware ---
struct LoggingMiddleware {
    struct context {};

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        LOG_INFO("Incoming Request: {} {} from {}", req.method_string(), req.url, req.remote_ip_address);
    }

    void after_handle(crow::request& req, crow::response& res, context& ctx) {
        LOG_INFO("Outgoing Response: {} {} - Status: {}", req.method_string(), req.url, res.code);
    }
};

// --- 4. Rate Limiting Middleware ---
struct RateLimitMiddleware {
    struct context {};

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        if (!AppConfig::RATE_LIMIT_ENABLED) {
            return; // Rate limiting is disabled
        }

        std::string client_id = req.remote_ip_address; // Use IP address as client identifier
        if (!RateLimiting::app_rate_limiter.allowRequest(client_id)) {
            LOG_WARN("Rate Limit Exceeded for IP: {} on {}", client_id, req.url);
            res.code = crow::status::TOO_MANY_REQUESTS;
            res.set_header("Content-Type", "application/json");
            res.write(BadRequestException("Too Many Requests. Please try again later.").to_json().dump());
            res.end(); // Stop further processing
        }
    }

    void after_handle(crow::request& req, crow::response& res, context& ctx) {
        // No-op
    }
};

#endif // MIDDLEWARE_H
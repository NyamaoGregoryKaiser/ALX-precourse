#include "AuthMiddleware.h"
#include "utils/Logger.h"
#include "config/config.h"

namespace tm_api {
namespace middleware {

AuthMiddleware::AuthMiddleware(std::shared_ptr<tm_api::auth::JWTManager> jwtManager)
    : jwtManager(jwtManager) {
    LOG_INFO("AuthMiddleware initialized.");
}

void AuthMiddleware::before_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    if (Config::isRateLimitEnabled()) {
        std::string ip = req.remote_ip_address;
        if (!tm_api::utils::RateLimiter::allowRequest(ip)) {
            res.code = 429; // Too Many Requests
            res.write(tm_api::utils::ErrorHandler::toJsonError("TooManyRequests", "Rate limit exceeded.", 429));
            res.end();
            LOG_WARN("Rate limit exceeded for IP: {}", ip);
            return;
        }
    }

    auto token = extractToken(req);
    if (!token.has_value()) {
        // Not all routes require authentication. If it's a protected route,
        // the controller will throw an Unauthorized error.
        // We just mark context as unauthenticated for now.
        ctx.isAuthenticated = false;
        return;
    }

    auto payload = jwtManager->verifyToken(token.value());
    if (payload.has_value()) {
        ctx.userId = payload->userId;
        ctx.username = payload->username;
        ctx.role = payload->role;
        ctx.isAuthenticated = true;
        LOG_DEBUG("Authenticated user: {} (ID: {}, Role: {})", ctx.username, ctx.userId, ctx.role);
    } else {
        LOG_WARN("Failed to verify JWT for request from {}", req.remote_ip_address);
        ctx.isAuthenticated = false;
        // The route handler should check ctx.isAuthenticated and throw 401/403 if needed.
        // Or, for global protection, you could short-circuit here:
        // res.code = 401;
        // res.write(tm_api::utils::ErrorHandler::toJsonError("Unauthorized", "Invalid or expired token.", 401));
        // res.end();
    }
}

void AuthMiddleware::after_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    // No specific actions needed after handle for this middleware in Crow's model
}

std::optional<std::string> AuthMiddleware::extractToken(const crow::request& req) {
    const std::string& authHeader = req.get_header("Authorization");
    if (authHeader.empty()) {
        return std::nullopt;
    }

    if (authHeader.rfind("Bearer ", 0) == 0) { // Checks if string starts with "Bearer "
        return authHeader.substr(7); // Extract token part
    }
    return std::nullopt;
}

} // namespace middleware
} // namespace tm_api
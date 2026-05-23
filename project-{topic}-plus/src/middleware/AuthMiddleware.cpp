#include "AuthMiddleware.h"
#include "../logger/Logger.h"
#include "../middleware/ErrorHandlingMiddleware.h" // For error response helper

AuthMiddleware::AuthMiddleware() : secret(AppConfig::get_instance().jwt_secret) {}

void AuthMiddleware::before_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    if (secret.empty()) {
        Logger::get_logger()->critical("JWT Secret not configured. Authentication will fail.");
        res.code = 500;
        res.write(ErrorHandlingMiddleware::create_error_response("Server configuration error: JWT secret missing.", 500, "SERVER_ERROR").dump());
        res.end();
        return;
    }

    std::string auth_header = req.get_header("Authorization");
    if (auth_header.empty() || auth_header.substr(0, 7) != "Bearer ") {
        Logger::get_logger()->debug("Missing or malformed Authorization header.");
        res.code = 401;
        res.add_header("WWW-Authenticate", "Bearer realm=\"" + realm + "\"");
        res.write(ErrorHandlingMiddleware::create_error_response("Authentication required.", 401, "UNAUTHORIZED").dump());
        res.end();
        return;
    }

    std::string token = auth_header.substr(7); // "Bearer " is 7 chars
    std::optional<JwtUtils::Claims> claims = JwtUtils::decode(token, secret);

    if (!claims) {
        Logger::get_logger()->warn("Invalid or expired JWT token from {}", req.remote_ip_address);
        res.code = 401;
        res.add_header("WWW-Authenticate", "Bearer realm=\"" + realm + "\", error=\"invalid_token\"");
        res.write(ErrorHandlingMiddleware::create_error_response("Invalid or expired token.", 401, "UNAUTHORIZED").dump());
        res.end();
        return;
    }

    // Store claims in context for later use in route handlers
    ctx.authenticated_claims = claims;
    Logger::get_logger()->debug("User {} (role: {}) authenticated.", claims->user_id, claims->role);
    // Continue to route handler
}

void AuthMiddleware::after_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    // Optional: Log after request completion, or modify response
    // For now, nothing specific here.
}

bool AuthMiddleware::has_role(const AuthContext& ctx, UserRole required_role) {
    if (!ctx.authenticated_claims) {
        Logger::get_logger()->warn("Authorization check failed: No authenticated claims found.");
        return false;
    }

    UserRole user_role = string_to_user_role(ctx.authenticated_claims->role);

    // Simple role hierarchy: ADMIN can do everything a CUSTOMER can, and more.
    if (required_role == UserRole::CUSTOMER) {
        return user_role == UserRole::CUSTOMER || user_role == UserRole::ADMIN;
    } else if (required_role == UserRole::ADMIN) {
        return user_role == UserRole::ADMIN;
    }
    return false;
}

std::optional<JwtUtils::Claims> AuthMiddleware::get_claims(const AuthContext& ctx) {
    return ctx.authenticated_claims;
}
```cpp
#include "AuthMiddleware.hpp"
#include "../utils/ErrorHandler.hpp" // For handle_exception

AuthMiddleware::AuthMiddleware(JWTManager& jwt_manager)
    : jwt_manager_(jwt_manager) {}

void AuthMiddleware::before_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    Logger::log(LogLevel::DEBUG, "AuthMiddleware: Before handle for " + req.url);

    // Skip authentication for public routes (e.g., /auth/register, /auth/login)
    // This can be done by tagging routes in Crow or checking URL patterns here.
    if (req.url == "/api/v1/auth/register" || req.url == "/api/v1/auth/login") {
        return; // Public route, no auth needed
    }

    std::string auth_header = req.get_header("Authorization");

    if (auth_header.empty()) {
        res = handle_exception(UnauthorizedException("Authorization header missing."));
        res.end(); // End the request processing here
        return;
    }

    if (auth_header.length() <= 7 || auth_header.substr(0, 7) != "Bearer ") {
        res = handle_exception(UnauthorizedException("Invalid Authorization header format. Must be 'Bearer <token>'."));
        res.end();
        return;
    }

    std::string token = auth_header.substr(7); // Extract token part

    std::optional<DecodedToken> decoded_token_opt = jwt_manager_.verifyToken(token);

    if (!decoded_token_opt.has_value()) {
        res = handle_exception(UnauthorizedException("Invalid or expired authentication token."));
        res.end();
        return;
    }

    DecodedToken decoded_token = decoded_token_opt.value();
    
    // Populate context for the endpoint handler
    ctx.user_id = decoded_token.user_id;
    ctx.username = decoded_token.username;
    ctx.role = decoded_token.role;

    Logger::log(LogLevel::DEBUG, "AuthMiddleware: User " + std::to_string(ctx.user_id) + " (" + ctx.username + ", " + userRoleToString(ctx.role) + ") authenticated.");
    // If no response is set, processing continues to the endpoint handler
}

void AuthMiddleware::after_handle(crow::request& /*req*/, crow::response& /*res*/, AuthContext& /*ctx*/) {
    // Post-processing logic if needed, e.g., logging response details
    Logger::log(LogLevel::DEBUG, "AuthMiddleware: After handle.");
}

bool AuthMiddleware::hasRole(AuthContext& ctx, UserRole required_role) {
    if (ctx.role == UserRole::ADMIN) {
        return true; // Admin has access to everything
    }
    return ctx.role == required_role;
}
```
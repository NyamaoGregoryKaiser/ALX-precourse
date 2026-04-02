```cpp
#include "AuthMiddleware.h"
#include "../models/User.h" // For UserRole enum

namespace TaskManager {
namespace Middleware {

AuthMiddleware::AuthMiddleware(Services::AuthService& auth_service, Services::UserService& user_service)
    : auth_service_(auth_service), user_service_(user_service) {}

void AuthMiddleware::before_handle(crow::request& req, crow::response& res, context& ctx) {
    ctx.is_authenticated = false;
    ctx.is_admin = false;
    ctx.user_id = 0;
    ctx.username = "";
    ctx.role = "";

    std::string auth_header = req.get_header("Authorization");
    if (auth_header.empty()) {
        Utils::Logger::getLogger()->debug("Authorization header missing for {}", req.url);
        return; // Not authenticated, but allow request to proceed if route doesn't require auth
    }

    if (auth_header.rfind("Bearer ", 0) != 0) { // Check if it starts with "Bearer "
        Utils::Logger::getLogger()->warn("Invalid Authorization header format for {}", req.url);
        // This is a bad request, but we let the controller handle it, or implicitly fail auth check
        return;
    }

    std::string token = auth_header.substr(7); // Extract token after "Bearer "

    try {
        long long user_id = auth_service_.authenticateToken(token);
        std::optional<Models::User> user = user_service_.getUserById(user_id);

        if (!user) {
            Utils::Logger::getLogger()->error("Authenticated token refers to non-existent user ID: {}", user_id);
            throw Exceptions::UnauthorizedException("User no longer exists.");
        }

        ctx.user_id = user_id;
        ctx.username = user->username;
        ctx.role = Models::userRoleToString(user->role);
        ctx.is_admin = (user->role == Models::UserRole::ADMIN);
        ctx.is_authenticated = true;
        Utils::Logger::getLogger()->debug("User {} (ID: {}) authenticated for route {}", user->username, user_id, req.url);

    } catch (const Exceptions::UnauthorizedException& e) {
        // Logged inside auth_service or specific JWTUtils
        // Context remains unauthenticated
        Utils::Logger::getLogger()->warn("Authentication failed for request {} {}: {}", req.method_string(), req.url, e.what());
    } catch (const std::exception& e) {
        Utils::Logger::getLogger()->error("Unexpected error during authentication for {}: {}", req.url, e.what());
    }
}

void AuthMiddleware::after_handle(crow::request& /*req*/, crow::response& /*res*/, context& /*ctx*/) {
    // No specific post-processing needed for authentication context
}

} // namespace Middleware
} // namespace TaskManager
```
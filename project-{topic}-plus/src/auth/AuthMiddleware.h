#pragma once

#include <crow.h>
#include <memory>
#include <string>
#include "JWTManager.h"
#include "utils/ErrorHandler.h"
#include "utils/RateLimiter.h"

namespace tm_api {
namespace middleware {

// Context object to pass user information down the request chain
struct AuthContext : crow::ILocalContext {
    std::string userId;
    std::string username;
    std::string role;
    bool isAuthenticated = false;

    // Helper to check if user has a specific role
    bool hasRole(const std::string& requiredRole) const {
        return isAuthenticated && role == requiredRole;
    }
    bool isAdmin() const { return hasRole("admin"); }
    bool isUser() const { return hasRole("user"); }
};

class AuthMiddleware : public crow::IMiddleware {
public:
    AuthMiddleware(std::shared_ptr<tm_api::auth::JWTManager> jwtManager);

    void before_handle(crow::request& req, crow::response& res, AuthContext& ctx);
    void after_handle(crow::request& req, crow::response& res, AuthContext& ctx);

    // Helper to apply this middleware to a route
    template<typename Func>
    auto validate_middleware(Func&& handler) {
        return crow::validate_middleware(this, std::forward<Func>(handler));
    }

private:
    std::shared_ptr<tm_api::auth::JWTManager> jwtManager;

    // Helper function to extract JWT from Authorization header
    std::optional<std::string> extractToken(const crow::request& req);
};

} // namespace middleware
} // namespace tm_api
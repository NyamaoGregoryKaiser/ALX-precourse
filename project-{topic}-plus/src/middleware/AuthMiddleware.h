#ifndef AUTH_MIDDLEWARE_H
#define AUTH_MIDDLEWARE_H

#include <crow.h>
#include <string>
#include <optional>
#include "../utils/JwtUtils.h"
#include "../config/AppConfig.h"
#include "../models/User.h" // For UserRole

// Define a custom structure to pass user info through request context
struct AuthContext {
    crow::request& req;
    crow::response& res;
    // Add member to store authenticated user's claims
    std::optional<JwtUtils::Claims> authenticated_claims;

    AuthContext(crow::request& r, crow::response& rs) : req(r), res(rs) {}
};

// Custom middleware for Crow
struct AuthMiddleware {
    std::string realm = "Restricted Area";
    std::string secret; // JWT secret

    AuthMiddleware();

    // Before handle function, verifies JWT
    void before_handle(crow::request& req, crow::response& res, AuthContext& ctx);

    // After handle function (optional)
    void after_handle(crow::request& req, crow::response& res, AuthContext& ctx);

    // Helper for role-based authorization
    static bool has_role(const AuthContext& ctx, UserRole required_role);
    static std::optional<JwtUtils::Claims> get_claims(const AuthContext& ctx);
};

#endif // AUTH_MIDDLEWARE_H
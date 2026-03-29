```cpp
#ifndef AUTH_MIDDLEWARE_HPP
#define AUTH_MIDDLEWARE_HPP

#include "crow.h"
#include "../utils/JWTManager.hpp"
#include "../utils/Logger.hpp"
#include "../exceptions/CustomExceptions.hpp" // For UnauthorizedException, ForbiddenException

// Crow middleware requires a struct with a before_handle and/or after_handle method
// It must be copyable or move-only for Crow to use it.
struct AuthContext {
    int user_id = 0;
    std::string username;
    UserRole role = UserRole::USER;
};

class AuthMiddleware {
public:
    // This is Crow's expected type alias for the context
    using context = AuthContext;

    AuthMiddleware(JWTManager& jwt_manager); // Dependency injection for JWTManager

    // The 'before_handle' method is called before the endpoint handler
    void before_handle(crow::request& req, crow::response& res, AuthContext& ctx);

    // The 'after_handle' method is called after the endpoint handler (optional)
    void after_handle(crow::request& req, crow::response& res, AuthContext& ctx);

    // Helper for role-based authorization check
    static bool hasRole(AuthContext& ctx, UserRole required_role);

private:
    JWTManager& jwt_manager_; // Reference to shared JWTManager instance
};

#endif // AUTH_MIDDLEWARE_HPP
```
```cpp
#ifndef AUTH_MIDDLEWARE_H
#define AUTH_MIDDLEWARE_H

#include <crow.h>
#include <string>
#include "../utils/JwtManager.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"

namespace PaymentProcessor {
namespace Middleware {

using namespace PaymentProcessor::Utils;
using namespace PaymentProcessor::Exceptions;

// Define a context structure to pass user info through requests
struct AuthContext {
    long long userId = 0;
    std::string userRole;
    bool isAuthenticated = false;
};

// Custom Crow middleware for JWT authentication
struct AuthMiddleware {
    // This is the "PerRoute" context type, available to handlers
    struct Context {
        AuthContext authContext; // Our custom authentication context
    };

    // The "PerRequest" type for the middleware itself.
    // In Crow 1.0, it's typically just `AuthMiddleware` itself or a struct.
    // We'll use the main struct as the middleware.

    template <typename Next>
    void call(crow::request& req, crow::response& res, Next&& next) {
        LOG_DEBUG("AuthMiddleware: Processing request for {}", req.url);

        std::string authHeader = req.get_header("Authorization");
        if (authHeader.empty() || authHeader.rfind("Bearer ", 0) != 0) { // Check for "Bearer " prefix
            LOG_WARN("AuthMiddleware: No or invalid Authorization header for {}", req.url);
            // Optionally allow some public routes to pass without auth,
            // or return 401 directly here for protected routes.
            // For now, we'll mark as unauthenticated and let the route handler decide.
            req.template get_context<Context>().authContext.isAuthenticated = false;
            next(req, res); // Continue processing the request
            return;
        }

        std::string token = authHeader.substr(7); // "Bearer ".length() == 7

        if (!JwtManager::verifyToken(token)) {
            LOG_WARN("AuthMiddleware: Invalid or expired JWT token for {}", req.url);
            res.code = 401; // Unauthorized
            res.write(R"({"error":"Invalid or expired token"})");
            res.end();
            return;
        }

        // Token is valid, extract claims and put into context
        long long userId = std::stoll(JwtManager::getClaim(token, "user_id"));
        std::string userRole = JwtManager::getClaim(token, "role");

        req.template get_context<Context>().authContext.userId = userId;
        req.template get_context<Context>().authContext.userRole = userRole;
        req.template get_context<Context>().authContext.isAuthenticated = true;

        LOG_DEBUG("AuthMiddleware: User {} (Role: {}) authenticated for {}.", userId, userRole, req.url);
        next(req, res);
    }
};

} // namespace Middleware
} // namespace PaymentProcessor

#endif // AUTH_MIDDLEWARE_H
```
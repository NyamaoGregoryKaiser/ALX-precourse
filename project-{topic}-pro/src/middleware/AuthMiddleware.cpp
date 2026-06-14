```cpp
#include "AuthMiddleware.h"
#include "../models/JWTClaims.h"

void AuthMiddleware::before_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    // Skip authentication for specific public routes (e.g., login, register)
    if (req.url.find("/api/v1/auth") == 0) {
        return;
    }

    const std::string& auth_header = req.get_header("Authorization");
    if (auth_header.empty() || auth_header.rfind("Bearer ", 0) != 0) {
        Logger::warn("AuthMiddleware: Missing or malformed Authorization header for {}", req.url);
        res.code = 401;
        res.write("Unauthorized: Missing or invalid Authorization header.");
        res.end(); // End the response early
        return;
    }

    std::string token = auth_header.substr(7); // "Bearer ".length()
    if (!jwt_manager) {
        Logger::critical("AuthMiddleware: JWTManager not initialized!");
        res.code = 500;
        res.write("Internal Server Error: Authentication system misconfigured.");
        res.end();
        return;
    }

    try {
        JWTClaims claims = jwt_manager->decodeToken(token);
        ctx.username = claims.username;
        ctx.is_authenticated = true;
        Logger::debug("AuthMiddleware: User '{}' authenticated.", ctx.username);
    } catch (const std::exception& e) {
        Logger::warn("AuthMiddleware: JWT validation failed for {}: {}", req.url, e.what());
        res.code = 401;
        res.write("Unauthorized: Invalid or expired token.");
        res.end();
    }
}

void AuthMiddleware::after_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    // No specific action needed after handle, just logging example
    if (ctx.is_authenticated) {
        Logger::debug("AuthMiddleware: Request for user '{}' completed for {}", ctx.username, req.url);
    } else {
        Logger::debug("AuthMiddleware: Unauthenticated request for {} completed.", req.url);
    }
}
```
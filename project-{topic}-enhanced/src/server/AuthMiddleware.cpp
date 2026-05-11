#include "AuthMiddleware.h"
#include "../services/AuthService.h"
#include "../utils/Logger.h"
#include <boost/algorithm/string/predicate.hpp> // For starts_with

User AuthMiddleware::authenticate(const std::string& auth_header, AuthService& authService) {
    if (auth_header.empty()) {
        throw AuthException("Authorization header missing.");
    }

    if (!boost::algorithm::starts_with(auth_header, "Bearer ")) {
        throw AuthException("Invalid authorization scheme. Expected 'Bearer'.");
    }

    std::string token = auth_header.substr(7); // "Bearer ".length()

    try {
        std::map<std::string, std::string> claims = authService.verifyToken(token);
        if (claims.empty()) {
            throw AuthException("Invalid or expired token.");
        }

        // Extract user information from claims
        User user_ctx;
        if (claims.count("userId")) {
            user_ctx.id = std::stoi(claims["userId"]);
        } else {
            throw AuthException("Token missing userId claim.");
        }
        user_ctx.username = claims.count("username") ? claims["username"] : "";
        user_ctx.role = claims.count("role") ? claims["role"] : "USER"; // Default role

        LOG_DEBUG("User authenticated: ID={}, Role={}", user_ctx.id.value_or(0), user_ctx.role);
        return user_ctx;
    } catch (const AuthException& e) {
        throw; // Re-throw AuthException
    } catch (const std::exception& e) {
        LOG_ERROR("Token verification failed: {}", e.what());
        throw AuthException("Token verification failed.");
    }
}
```
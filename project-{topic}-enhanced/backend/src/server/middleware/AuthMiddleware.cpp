```cpp
#include "AuthMiddleware.h"
#include <jwt-cpp/jwt.h>

void AuthMiddleware::before_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    Logger::debug("AuthMiddleware: before_handle for path {}", req.url);

    // Skip authentication for public routes (e.g., login, register)
    if (req.url == "/api/auth/login" || req.url == "/api/auth/register" || req.url == "/health" || req.url == "/") {
        ctx.is_authenticated = false; // Explicitly mark as not authenticated for public routes
        return;
    }

    std::string auth_header = req.get_header("Authorization");
    if (auth_header.empty() || auth_header.rfind("Bearer ", 0) != 0) {
        Logger::warn("AuthMiddleware: Missing or malformed Authorization header for protected route {}", req.url);
        res.code = 401; // Unauthorized
        res.write(JsonUtils::createErrorResponse("Authentication required. Missing or invalid Authorization header.").dump());
        res.end();
        return;
    }

    std::string token = auth_header.substr(7); // "Bearer ".length()
    Logger::debug("AuthMiddleware: Received token: {}", token);

    try {
        auto decoded_token = TokenManager::verifyToken(token, jwt_secret_);
        std::string user_id_str = decoded_token.get_payload_claim("user_id").as_string();
        std::string role = decoded_token.get_payload_claim("role").as_string();

        int user_id = std::stoi(user_id_str);

        // Fetch user from DB to ensure they still exist and token is valid against actual user state
        auto user_opt = user_repo_->findById(user_id);
        if (!user_opt) {
            Logger::warn("AuthMiddleware: User with ID {} from token not found in DB.", user_id);
            res.code = 401;
            res.write(JsonUtils::createErrorResponse("Invalid authentication token (user not found).").dump());
            res.end();
            return;
        }

        ctx.is_authenticated = true;
        ctx.current_user = user_opt.value();
        ctx.user_role = role; // Set role from token (could also verify against DB role for stronger security)
        Logger::info("AuthMiddleware: User {} (ID: {}) authenticated with role: {}", ctx.current_user.getEmail(), ctx.current_user.getId(), ctx.user_role);

    } catch (const jwt::verification_error& e) {
        Logger::error("AuthMiddleware: JWT verification failed: {}", e.what());
        res.code = 401;
        res.write(JsonUtils::createErrorResponse("Invalid or expired authentication token.").dump());
        res.end();
        return;
    } catch (const std::exception& e) {
        Logger::error("AuthMiddleware: Error processing token: {}", e.what());
        res.code = 500;
        res.write(JsonUtils::createErrorResponse("Server error during authentication.").dump());
        res.end();
        return;
    }
}

void AuthMiddleware::after_handle(crow::request& req, crow::response& res, AuthContext& ctx) {
    // Log after-handle for AuthMiddleware if needed
    // Currently no specific post-processing for authentication
}

bool AuthMiddleware::authorize(const AuthContext& ctx, const std::string& required_role) {
    if (!ctx.is_authenticated) {
        Logger::warn("Authorization failed: User not authenticated.");
        return false;
    }
    if (ctx.user_role == "admin") { // Admins can do anything
        return true;
    }
    return ctx.user_role == required_role;
}

bool AuthMiddleware::authorize_owner(const AuthContext& ctx, int resource_owner_id) {
    if (!ctx.is_authenticated) {
        Logger::warn("Authorization failed (owner check): User not authenticated.");
        return false;
    }
    if (ctx.user_role == "admin") {
        return true; // Admin can access any resource
    }
    return ctx.current_user.getId() == resource_owner_id;
}
```
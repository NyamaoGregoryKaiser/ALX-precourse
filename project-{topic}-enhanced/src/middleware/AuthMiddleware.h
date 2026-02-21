```cpp
#ifndef AUTHMIDDLEWARE_H
#define AUTHMIDDLEWARE_H

#include <crow.h>
#include <string>
#include <stdexcept>
#include <nlohmann/json.hpp>

#include "../utils/Logger.h"
#include "../utils/Crypto.h"
#include "../exceptions/ApiException.h"

// Define a context struct to pass authenticated user info to handlers
struct AuthContext {
    std::string user_id;
    std::string username; // Optional, useful for logging/display
};

class AuthMiddleware {
public:
    // Define the Context type for this middleware
    struct context : crow::IBaseMiddleware::context {
        AuthContext auth_context; // The actual context data
    };

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        // Skip authentication for OPTIONS requests (preflight CORS)
        if (req.method == crow::HTTPMethod::OPTIONS) {
            return;
        }

        // Check for public routes that don't need authentication
        // This is a simplified check; in a real app, you might have a dedicated public route list
        if (req.url.find("/api/v1/auth/register") == 0 || req.url.find("/api/v1/auth/login") == 0 ||
            req.url.find("/web/") == 0 || req.url.find("/static/") == 0) {
            return; // Allow access without authentication
        }
        
        // Extract token from Authorization header
        const char* auth_header = req.get_header("Authorization");
        if (!auth_header) {
            LOG_WARN("Authentication failed: No Authorization header.");
            // Send 401 Unauthorized
            res.code = crow::UNAUTHORIZED;
            res.write(nlohmann::json{{"error", "Unauthorized"}, {"message", "Missing Authorization header"}}.dump());
            res.end();
            return;
        }

        std::string token_str = auth_header;
        if (token_str.length() <= 7 || token_str.substr(0, 7) != "Bearer ") {
            LOG_WARN("Authentication failed: Invalid Authorization header format.");
            res.code = crow::UNAUTHORIZED;
            res.write(nlohmann::json{{"error", "Unauthorized"}, {"message", "Invalid Authorization header format. Must be 'Bearer <token>'"}}.dump());
            res.end();
            return;
        }

        std::string jwt_token = token_str.substr(7);

        try {
            jwt::decoded_jwt decoded_token = Crypto::verify_jwt(jwt_token);
            
            // Extract user information from token claims
            ctx.auth_context.user_id = decoded_token.get_subject();
            
            auto username_claim = decoded_token.get_payload_claim("username");
            if (!username_claim.is_empty()) {
                ctx.auth_context.username = username_claim.as_string();
            } else {
                LOG_WARN("JWT token for user ID {} missing username claim.", ctx.auth_context.user_id);
            }
            
            LOG_DEBUG("Authenticated user: ID={}, Username={}", ctx.auth_context.user_id, ctx.auth_context.username);

            // Authentication successful, proceed to handler
        } catch (const std::runtime_error& e) {
            // JWT verification failed (e.g., invalid signature, expired)
            LOG_WARN("JWT verification failed: {}. Token: {}", e.what(), jwt_token);
            res.code = crow::UNAUTHORIZED;
            res.write(nlohmann::json{{"error", "Unauthorized"}, {"message", e.what()}}.dump());
            res.end();
        } catch (const std::exception& e) {
            LOG_ERROR("Unexpected error during authentication: {}", e.what());
            res.code = crow::INTERNAL_SERVER_ERROR;
            res.write(nlohmann::json{{"error", "Internal Server Error"}, {"message", "An unexpected error occurred during authentication."}}.dump());
            res.end();
        }
    }

    void after_handle(crow::request& /*req*/, crow::response& /*res*/, context& /*ctx*/) {
        // Post-processing if needed
    }
};

#endif // AUTHMIDDLEWARE_H
```
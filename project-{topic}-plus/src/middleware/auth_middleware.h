#pragma once

#include <crow.h>
#include <string>
#include "../utils/jwt_manager.h"
#include "../utils/logger.h"

// Define a structure to hold user information from the JWT
struct AuthContext {
    std::string user_id;
    std::string username;
    std::string email;
    // Add any other relevant claims from the token
};

class AuthMiddleware : public crow::ILogMiddleware {
public:
    AuthMiddleware(JwtManager& jwt_manager) : jwt_manager_(jwt_manager) {}

    struct context {
        AuthContext auth_context;
        bool is_authenticated = false;
    };

    void before_handle(crow::request& req, crow::response& res, context& ctx) override {
        // Allow OPTIONS requests to pass through without authentication for CORS pre-flight
        if (req.method == "OPTIONS") {
            return;
        }

        std::string auth_header = req.get_header("Authorization");
        if (auth_header.empty() || auth_header.length() < 7 || auth_header.substr(0, 6) != "Bearer") {
            Logger::warn("AuthMiddleware: Missing or malformed Authorization header for path: {}", req.url);
            res.code = 401; // Unauthorized
            res.write("{\"message\": \"Unauthorized: Missing or invalid token\"}");
            res.end();
            return;
        }

        std::string token_string = auth_header.substr(7); // "Bearer " is 7 chars
        try {
            auto decoded_token = jwt_manager_.verifyToken(token_string);
            ctx.is_authenticated = true;
            ctx.auth_context.user_id = decoded_token.get_payload_claim("user_id").as_string();
            ctx.auth_context.username = decoded_token.get_payload_claim("username").as_string();
            ctx.auth_context.email = decoded_token.get_payload_claim("email").as_string();
            Logger::debug("AuthMiddleware: User {} ({}) authenticated.", ctx.auth_context.username, ctx.auth_context.user_id);
        } catch (const jwt::signature_verification_error& e) {
            Logger::warn("AuthMiddleware: JWT signature verification failed: {} for path: {}", e.what(), req.url);
            res.code = 401;
            res.write("{\"message\": \"Unauthorized: Invalid token signature\"}");
            res.end();
        } catch (const jwt::token_verification_error& e) {
            Logger::warn("AuthMiddleware: JWT verification failed: {} for path: {}", e.what(), req.url);
            res.code = 401;
            res.write("{\"message\": \"Unauthorized: Token expired or invalid\"}");
            res.end();
        } catch (const std::exception& e) {
            Logger::error("AuthMiddleware: Error processing JWT: {} for path: {}", e.what(), req.url);
            res.code = 401;
            res.write("{\"message\": \"Unauthorized: Invalid token\"}");
            res.end();
        }
    }

    void after_handle(crow::request& req, crow::response& res, context& ctx) override {
        // No specific action needed after handle, but could log response status etc.
        // Logger::debug("AuthMiddleware: Response sent for path {}. Status: {}", req.url, res.code);
    }

private:
    JwtManager& jwt_manager_;
};
```
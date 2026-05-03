```cpp
#ifndef MLTOOLKIT_AUTH_MIDDLEWARE_HPP
#define MLTOOLKIT_AUTH_MIDDLEWARE_HPP

#include <crow.h>
#include <string>
#include <vector>
#include <jwt-cpp/jwt.h> // Requires https://github.com/Thalhammer/jwt-cpp
#include "../common/Logger.hpp"
#include "../common/Exceptions.hpp"
#include "../config/Config.hpp"

namespace MLToolkit {
namespace Middleware {

class AuthMiddleware {
public:
    struct context {}; // Crow context struct

    AuthMiddleware() = default;

    void before_handle(crow::request& req, crow::response& res, context& ctx) {
        // Skip auth for login route or public routes
        if (req.url == "/api/v1/auth/login" || req.url == "/") {
            return;
        }

        std::string auth_header = req.get_header("Authorization");
        if (auth_header.empty() || auth_header.rfind("Bearer ", 0) != 0) {
            LOG_WARN("AuthMiddleware: Missing or invalid Authorization header.");
            res.code = 401; // Unauthorized
            res.write({"error", "Authorization header missing or malformed."});
            res.end();
            return;
        }

        std::string token = auth_header.substr(7); // Remove "Bearer " prefix
        try {
            auto verifier = jwt::verify()
                                .allow_algorithm(jwt::algorithm::hs256{get_jwt_secret()})
                                .with_issuer("ml_toolkit_server");

            auto decoded_token = verifier.verify(token);
            
            // You can extract claims and store them in context if needed
            // For example, ctx.user_id = decoded_token.get_payload_claim("user_id").as_int();
            
            LOG_DEBUG("AuthMiddleware: Token valid for user: {}", decoded_token.get_subject());
        } catch (const jwt::verification_error& e) {
            LOG_ERROR("AuthMiddleware: JWT verification failed: {}", e.what());
            res.code = 403; // Forbidden
            res.write({"error", "Invalid or expired token."});
            res.end();
        } catch (const Common::Config::ConfigException& e) {
            LOG_CRITICAL("AuthMiddleware: JWT secret not configured: {}", e.what());
            res.code = 500;
            res.write({"error", "Server configuration error (JWT secret missing)."});
            res.end();
        } catch (const std::exception& e) {
            LOG_ERROR("AuthMiddleware: Unexpected error during token validation: {}", e.what());
            res.code = 500;
            res.write({"error", "Internal server error during authentication."});
            res.end();
        }
    }

    void after_handle(crow::request& /*req*/, crow::response& /*res*/, context& /*ctx*/) {
        // No post-processing needed for authentication
    }

private:
    std::string get_jwt_secret() {
        std::string secret = Config::Config::get_instance().get_string("JWT_SECRET");
        if (secret.empty()) {
            throw Common::Config::ConfigException("JWT_SECRET is not configured.");
        }
        return secret;
    }
};

} // namespace Middleware
} // namespace MLToolkit

#endif // MLTOOLKIT_AUTH_MIDDLEWARE_HPP
```
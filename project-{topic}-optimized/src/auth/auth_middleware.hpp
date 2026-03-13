#ifndef CMS_AUTH_MIDDLEWARE_HPP
#define CMS_AUTH_MIDDLEWARE_HPP

#include <pistache/router.h>
#include <pistache/http.h>
#include <string>
#include <memory>
#include "jwt_manager.hpp"
#include "../common/logger.hpp"
#include "../common/error.hpp"
#include "../models/user.hpp"

namespace cms::api {

// Context structure to hold authenticated user data
struct AuthContext {
    std::string user_id;
    std::string username;
    cms::models::UserRole role;

    bool has_role(cms::models::UserRole required_role) const {
        return role >= required_role;
    }
};

// Custom `Request` to carry AuthContext
class AuthenticatedRequest : public Pistache::Rest::Request {
public:
    AuthContext auth_context;

    // Inherit constructors
    using Pistache::Rest::Request::Request;
};

// Middleware to verify JWT token and populate AuthContext
class AuthMiddleware {
public:
    explicit AuthMiddleware(std::shared_ptr<cms::auth::JwtManager> jwt_manager)
        : jwt_manager_(std::move(jwt_manager)) {
        if (!jwt_manager_) {
            throw std::runtime_error("AuthMiddleware requires a valid JwtManager.");
        }
    }

    void handle(const Pistache::Rest::Request& req, Pistache::Http::ResponseWriter response,
                std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next) {
        
        LOG_DEBUG("AuthMiddleware: processing request to {}", req.resource());

        // Extract token from Authorization header
        auto auth_header = req.headers().tryGet<Pistache::Http::Header::Authorization>();
        if (!auth_header) {
            LOG_WARN("AuthMiddleware: Missing Authorization header.");
            throw cms::common::UnauthorizedException("Missing Authorization header.");
        }

        std::string token_str = auth_header->value();
        if (token_str.length() <= 7 || token_str.substr(0, 7) != "Bearer ") {
            LOG_WARN("AuthMiddleware: Invalid Authorization header format.");
            throw cms::common::UnauthorizedException("Invalid Authorization header format.");
        }
        token_str = token_str.substr(7); // Remove "Bearer " prefix

        // Verify token
        std::optional<cms::auth::JwtPayload> payload = jwt_manager_->verify_token(token_str);
        if (!payload) {
            LOG_WARN("AuthMiddleware: Invalid or expired JWT token.");
            throw cms::common::UnauthorizedException("Invalid or expired token.");
        }

        // Create an AuthenticatedRequest and populate AuthContext
        AuthenticatedRequest auth_req = req;
        auth_req.auth_context = {payload->user_id, payload->username, cms::models::string_to_user_role(payload->role)};
        
        LOG_DEBUG("AuthMiddleware: User {} (ID: {}, Role: {}) authenticated.", payload->username, payload->user_id, payload->role);
        
        // Pass the authenticated request to the next handler
        next(auth_req, std::move(response));
    }

private:
    std::shared_ptr<cms::auth::JwtManager> jwt_manager_;
};

// Helper function to cast Request to AuthenticatedRequest
inline const AuthenticatedRequest& as_authenticated_request(const Pistache::Rest::Request& req) {
    return static_cast<const AuthenticatedRequest&>(req);
}

} // namespace cms::api

#endif // CMS_AUTH_MIDDLEWARE_HPP
```
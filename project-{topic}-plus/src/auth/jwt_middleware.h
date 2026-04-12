#pragma once

#include <pistache/http.h>
#include <pistache/router.h>
#include <pistache/endpoint.h>

#include "src/auth/auth_service.h"
#include "src/utils/logger.h"
#include "src/utils/exceptions.h"
#include "src/models/user.h" // For UserRole

// Context struct to pass authenticated user info down the request chain
struct AuthContext {
    long user_id;
    std::string username;
    UserRole role;
};

// Custom exception for when authentication is required
class AuthenticationRequiredException : public UnauthorizedException {
public:
    explicit AuthenticationRequiredException(const std::string& message = "Authentication Required")
        : UnauthorizedException(message) {}
};

// JWT Authentication Middleware
class JwtMiddleware {
public:
    JwtMiddleware(AuthService& auth_service);

    // Middleware function to authenticate requests
    void authenticate(const Pistache::Rest::Request& request, Pistache::Http::ResponseWriter response, std::function<void(const Pistache::Rest::Request&, Pistache::Http::ResponseWriter)> next);

    // Authorization checker for roles
    static void require_role(UserRole required_role, const Pistache::Rest::Request& request);

private:
    AuthService& auth_service_;
};
```
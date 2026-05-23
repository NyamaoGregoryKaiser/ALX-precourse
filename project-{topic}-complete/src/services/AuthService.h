```cpp
#pragma once

#include <string>
#include <jwt-cpp/jwt.h>
#include <drogon/drogon.h>
#include "models/User.h"
#include <optional>

namespace CMS::Services {

class AuthService {
public:
    explicit AuthService(drogon::orm::DbClientPtr dbClient);

    // Authenticate user by email and password, return JWT token and user info if successful
    drogon::orm::Future<std::tuple<std::string, CMS::Models::User>> authenticate(const std::string& email, const std::string& password);

    // Verify a JWT token and extract user ID and role
    std::optional<std::pair<long long, std::string>> verifyToken(const std::string& token);

    // Check if a user has a specific role
    static bool hasRole(const std::string& userRole, const std::string& requiredRole);
    static bool hasAnyRole(const std::string& userRole, const std::vector<std::string>& requiredRoles);

private:
    std::string generateToken(long long userId, const std::string& userRole);
    drogon::orm::DbClientPtr dbClient_;
    CMS::Models::UserMapper userMapper_;
    std::string jwtSecret_;
    int jwtExpirationSeconds_;
};

} // namespace CMS::Services
```
```cpp
#ifndef DATAVIZ_AUTHMIDDLEWARE_H
#define DATAVIZ_AUTHMIDDLEWARE_H

#include <crow.h>
#include <string>
#include <memory>
#include "../../db/UserRepository.h"
#include "../../utils/Logger.h"
#include "../utils/TokenManager.h"
#include "../utils/JsonUtils.h"
#include "../../data/models/User.h" // For User model

// Context struct for AuthMiddleware to pass user info to downstream handlers
struct AuthContext : crow::context<AuthContext> {
    User current_user;
    bool is_authenticated = false;
    std::string user_role; // e.g., "admin", "user"
};

class AuthMiddleware {
private:
    std::shared_ptr<UserRepository> user_repo_;
    std::string jwt_secret_;

public:
    // This constructor is used by Crow's app.get_middleware() but we need setters for dependencies
    AuthMiddleware() = default;

    void set_user_repository(std::shared_ptr<UserRepository> repo) {
        user_repo_ = std::move(repo);
    }

    void set_jwt_secret(const std::string& secret) {
        jwt_secret_ = secret;
    }

    void before_handle(crow::request& req, crow::response& res, AuthContext& ctx);
    void after_handle(crow::request& req, crow::response& res, AuthContext& ctx);

    // Helper for authorization checks
    static bool authorize(const AuthContext& ctx, const std::string& required_role);
    static bool authorize_owner(const AuthContext& ctx, int resource_owner_id);
};

#endif // DATAVIZ_AUTHMIDDLEWARE_H
```
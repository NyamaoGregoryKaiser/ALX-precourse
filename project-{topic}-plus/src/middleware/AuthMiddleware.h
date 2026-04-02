```cpp
#ifndef AUTH_MIDDLEWARE_H
#define AUTH_MIDDLEWARE_H

#include <crow.h>
#include <optional>
#include <string>
#include <mutex>
#include <map>
#include "../services/AuthService.h"
#include "../services/UserService.h"
#include "../exceptions/CustomExceptions.h"
#include "../utils/Logger.h"

namespace TaskManager {
namespace Middleware {

struct AuthMiddleware {
    AuthMiddleware(Services::AuthService& auth_service, Services::UserService& user_service);

    struct context {
        long long user_id;
        std::string username;
        std::string role;
        bool is_admin;
        bool is_authenticated;
    };

    void before_handle(crow::request& req, crow::response& res, context& ctx);
    void after_handle(crow::request& req, crow::response& res, context& ctx);

private:
    Services::AuthService& auth_service_;
    Services::UserService& user_service_;
};

} // namespace Middleware
} // namespace TaskManager

#endif // AUTH_MIDDLEWARE_H
```
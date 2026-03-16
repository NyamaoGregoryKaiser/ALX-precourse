```cpp
#ifndef MOBILE_BACKEND_USER_CONTROLLER_H
#define MOBILE_BACKEND_USER_CONTROLLER_H

#include <crow/crow.h>
#include "../services/user_service.h"
#include "../utils/error_middleware.h"
#include "../utils/auth_middleware.h"
#include "../utils/logger.h"

namespace mobile_backend {
namespace controllers {

class UserController {
public:
    UserController(services::UserService& user_service_instance)
        : user_service(user_service_instance) {}

    // Get user profile (authenticated user)
    crow::response get_user_profile(const crow::request& req, crow::response& res,
                                    const utils::AuthMiddleware::context& ctx);

    // Update user profile (username, email)
    crow::response update_user_profile(const crow::request& req, crow::response& res,
                                       const utils::AuthMiddleware::context& ctx);

    // Update user password
    crow::response update_user_password(const crow::request& req, crow::response& res,
                                        const utils::AuthMiddleware::context& ctx);

    // Delete user account
    crow::response delete_user_account(const crow::request& req, crow::response& res,
                                       const utils::AuthMiddleware::context& ctx);

private:
    services::UserService& user_service;
};

} // namespace controllers
} // namespace mobile_backend

#endif // MOBILE_BACKEND_USER_CONTROLLER_H
```
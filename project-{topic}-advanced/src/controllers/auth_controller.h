```cpp
#ifndef MOBILE_BACKEND_AUTH_CONTROLLER_H
#define MOBILE_BACKEND_AUTH_CONTROLLER_H

#include <crow/crow.h>
#include "../services/auth_service.h"
#include "../utils/error_middleware.h" // For custom exceptions
#include "../utils/logger.h"

namespace mobile_backend {
namespace controllers {

class AuthController {
public:
    AuthController(services::AuthService& auth_service_instance)
        : auth_service(auth_service_instance) {}

    // Register a new user
    crow::response register_user(const crow::request& req);

    // Authenticate a user and return a JWT token
    crow::response login_user(const crow::request& req);

private:
    services::AuthService& auth_service;
};

} // namespace controllers
} // namespace mobile_backend

#endif // MOBILE_BACKEND_AUTH_CONTROLLER_H
```
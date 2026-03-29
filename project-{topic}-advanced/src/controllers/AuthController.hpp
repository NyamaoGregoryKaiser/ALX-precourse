```cpp
#ifndef AUTH_CONTROLLER_HPP
#define AUTH_CONTROLLER_HPP

#include "crow.h"
#include <memory>
#include "../services/AuthService.hpp"
#include "../utils/JSONConverter.hpp"
#include "../utils/ErrorHandler.hpp"
#include "../models/DTOs.hpp" // For UserRegisterDTO, UserLoginDTO

class AuthController {
public:
    AuthController(std::shared_ptr<AuthService> auth_service);

    void registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app);

private:
    std::shared_ptr<AuthService> auth_service_;
};

#endif // AUTH_CONTROLLER_HPP
```
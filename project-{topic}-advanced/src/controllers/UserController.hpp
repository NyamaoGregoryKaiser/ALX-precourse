```cpp
#ifndef USER_CONTROLLER_HPP
#define USER_CONTROLLER_HPP

#include "crow.h"
#include <memory>
#include "../services/UserService.hpp"
#include "../utils/JSONConverter.hpp"
#include "../utils/ErrorHandler.hpp"
#include "../middleware/AuthMiddleware.hpp"
#include "../models/DTOs.hpp" // For UserUpdateDTO

class UserController {
public:
    UserController(std::shared_ptr<UserService> user_service);

    void registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app);

private:
    std::shared_ptr<UserService> user_service_;
};

#endif // USER_CONTROLLER_HPP
```
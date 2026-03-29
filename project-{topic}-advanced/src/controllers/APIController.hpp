```cpp
#ifndef API_CONTROLLER_HPP
#define API_CONTROLLER_HPP

#include "crow.h"
#include <memory>
#include "../database/DatabaseManager.hpp"
#include "../utils/JWTManager.hpp"
#include "../utils/CachingManager.hpp"
#include "../utils/RateLimiter.hpp"

// Service Includes
#include "../services/AuthService.hpp"
#include "../services/UserService.hpp"
#include "../services/ProjectService.hpp"
#include "../services/TaskService.hpp"

// Controller Includes
#include "AuthController.hpp"
#include "UserController.hpp"
#include "ProjectController.hpp"
#include "TaskController.hpp"

// Middleware Includes
#include "../middleware/AuthMiddleware.hpp"
#include "../middleware/RateLimitMiddleware.hpp"


class APIController {
public:
    APIController(std::shared_ptr<DatabaseManager> db_manager,
                  JWTManager& jwt_manager,
                  std::shared_ptr<CachingManager> cache_manager,
                  AuthMiddleware& auth_middleware,
                  RateLimitMiddleware& rate_limit_middleware);

    void registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app);

private:
    std::shared_ptr<DatabaseManager> db_manager_;
    JWTManager& jwt_manager_;
    std::shared_ptr<CachingManager> cache_manager_;
    AuthMiddleware& auth_middleware_;
    RateLimitMiddleware& rate_limit_middleware_;

    // Service instances
    std::shared_ptr<AuthService> auth_service_;
    std::shared_ptr<UserService> user_service_;
    std::shared_ptr<ProjectService> project_service_;
    std::shared_ptr<TaskService> task_service_;

    // Controller instances
    std::unique_ptr<AuthController> auth_controller_;
    std::unique_ptr<UserController> user_controller_;
    std::unique_ptr<ProjectController> project_controller_;
    std::unique_ptr<TaskController> task_controller_;
};

#endif // API_CONTROLLER_HPP
```
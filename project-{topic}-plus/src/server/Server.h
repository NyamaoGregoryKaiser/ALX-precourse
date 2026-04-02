```cpp
#ifndef SERVER_H
#define SERVER_H

#include <crow.h>
#include "../config/AppConfig.h"
#include "../database/Database.h"
#include "../cache/Cache.h"
#include "../utils/Logger.h"

// Services
#include "../services/UserService.h"
#include "../services/ProjectService.h"
#include "../services/TaskService.h"
#include "../services/AuthService.h"

// Controllers
#include "../controllers/AuthController.h"
#include "../controllers/UserController.h"
#include "../controllers/ProjectController.h"
#include "../controllers/TaskController.h"

// Middleware
#include "../middleware/ErrorHandlingMiddleware.h"
#include "../middleware/AuthMiddleware.h"
#include "../middleware/RateLimitingMiddleware.h"

namespace TaskManager {
namespace Server {

class ApiServer {
public:
    ApiServer(Config::AppConfig& config, Database::Database& db, Cache::Cache& cache);
    void run();

private:
    Config::AppConfig& config_;
    Database::Database& db_;
    Cache::Cache& cache_;

    // Initialize all services
    Services::UserService user_service_;
    Services::ProjectService project_service_;
    Services::TaskService task_service_;
    Services::AuthService auth_service_;

    // Initialize all controllers
    Controllers::AuthController auth_controller_;
    Controllers::UserController user_controller_;
    Controllers::ProjectController project_controller_;
    Controllers::TaskController task_controller_;

    // Crow App instance with middleware
    crow::App<
        Middleware::ErrorHandlingMiddleware,
        Middleware::AuthMiddleware,
        Middleware::RateLimitingMiddleware
    > app_;

    void setupRoutes();
    void initializeDatabase();
};

} // namespace Server
} // namespace TaskManager

#endif // SERVER_H
```
```cpp
#include "APIController.hpp"
#include "../utils/Logger.hpp"

APIController::APIController(std::shared_ptr<DatabaseManager> db_manager,
                             JWTManager& jwt_manager,
                             std::shared_ptr<CachingManager> cache_manager,
                             AuthMiddleware& auth_middleware,
                             RateLimitMiddleware& rate_limit_middleware)
    : db_manager_(db_manager),
      jwt_manager_(jwt_manager),
      cache_manager_(cache_manager),
      auth_middleware_(auth_middleware),
      rate_limit_middleware_(rate_limit_middleware)
{
    // Initialize services
    auth_service_ = std::make_shared<AuthService>(db_manager_, jwt_manager_);
    user_service_ = std::make_shared<UserService>(db_manager_);
    project_service_ = std::make_shared<ProjectService>(db_manager_);
    task_service_ = std::make_shared<TaskService>(db_manager_);

    // Initialize controllers
    auth_controller_ = std::make_unique<AuthController>(auth_service_);
    user_controller_ = std::make_unique<UserController>(user_service_);
    project_controller_ = std::make_unique<ProjectController>(project_service_, user_service_);
    task_controller_ = std::make_unique<TaskController>(task_service_, project_service_, user_service_);

    Logger::log(LogLevel::INFO, "APIController initialized, ready to register routes.");
}

void APIController::registerRoutes(crow::App<crow::CORSHandler, AuthMiddleware, RateLimitMiddleware>& app) {
    // Add shared middlewares to the app
    app.middleware_by_type<AuthMiddleware>() = auth_middleware_;
    app.middleware_by_type<RateLimitMiddleware>() = rate_limit_middleware_;
    
    // Global routes (e.g., health check)
    CROW_ROUTE(app, "/")([](){
        return "ALX Project Management API is running!";
    });

    CROW_ROUTE(app, "/health")([](){
        // In a real scenario, this would check DB connection, external services, etc.
        return crow::response(200, "{\"status\": \"OK\", \"message\": \"API is healthy!\"}");
    });

    // Register specific controllers' routes
    auth_controller_->registerRoutes(app);
    user_controller_->registerRoutes(app);
    project_controller_->registerRoutes(app);
    task_controller_->registerRoutes(app);

    Logger::log(LogLevel::INFO, "All API routes registered.");
}
```
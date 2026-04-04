#include "app.h"
#include "config/config.h"
#include "utils/Logger.h"

// Controllers
#include "auth/AuthController.h"
#include "users/UserController.h"
#include "tasks/TaskController.h"

// Services (for controller instantiation)
#include "auth/AuthService.h"
#include "users/UserService.h"
#include "tasks/TaskService.h"

// Repositories (for service instantiation)
#include "auth/JWTManager.h"
#include "users/UserRepository.h"
#include "tasks/TaskRepository.h"
#include "database/SQLiteManager.h"

// Middlewares
#include "auth/AuthMiddleware.h"
#include "middleware/ErrorMiddleware.h"
#include "middleware/LogMiddleware.h"
#include "utils/RateLimiter.h"

App::App() {
    LOG_DEBUG("Initializing application components...");

    // Initialize utilities
    tm_api::utils::RateLimiter::init();

    // Database
    auto dbManager = std::make_shared<tm_api::database::SQLiteManager>(Config::getDbPath());

    // JWT Manager
    auto jwtManager = std::make_shared<tm_api::auth::JWTManager>(
        Config::getJwtSecret(), Config::getJwtExpiryMinutes()
    );

    // Repositories
    auto userRepository = std::make_shared<tm_api::users::UserRepository>(dbManager);
    auto taskRepository = std::make_shared<tm_api::tasks::TaskRepository>(dbManager);

    // Services
    auto authService = std::make_shared<tm_api::auth::AuthService>(userRepository, jwtManager);
    auto userService = std::make_shared<tm_api::users::UserService>(userRepository);
    auto taskService = std::make_shared<tm_api::tasks::TaskService>(taskRepository, userRepository);

    // Controllers
    authController = std::make_unique<tm_api::auth::AuthController>(authService);
    userController = std::make_unique<tm_api::users::UserController>(userService);
    taskController = std::make_unique<tm_api::tasks::TaskController>(taskService);

    // Middlewares
    authMiddleware = std::make_unique<tm_api::middleware::AuthMiddleware>(jwtManager);
    errorMiddleware = std::make_unique<tm_api::middleware::ErrorMiddleware>();
    logMiddleware = std::make_unique<tm_api::middleware::LogMiddleware>();

    setupMiddlewares();
    setupRoutes();
}

void App::run(int port) {
    LOG_INFO("Crow app running on port {}", port);
    crow_app.port(port).multithreaded().run();
}

void App::setupMiddlewares() {
    LOG_DEBUG("Setting up global middlewares.");
    // Order matters: Log -> Error -> Auth -> RateLimit (if using a Crow middleware style)
    // For Crow's `validate_middleware`, you'd typically add them to individual routes or groups.
    // For global, we'll demonstrate using a common approach.

    // Crow doesn't have a global "before request" hook like some other frameworks.
    // Middlewares are typically applied to routes or app::validate_middleware.
    // For this example, we'll simulate global aspects through controller methods
    // or by applying `validate_middleware` to all relevant routes.
    // ErrorMiddleware will act as a global exception handler.
    // LogMiddleware will be applied per-route where relevant or via a common route handler.
    // AuthMiddleware will be applied to protected routes.
    // RateLimiter will be integrated into the AuthMiddleware or as a separate Crow middleware.

    crow_app.register_middleware<tm_api::middleware::LogMiddleware>(*logMiddleware);
    crow_app.register_middleware<tm_api::middleware::AuthMiddleware>(*authMiddleware);
    // Error handling in Crow is often done via exceptions caught at the route level
    // or by custom error handlers. A global ErrorMiddleware is harder to implement
    // directly as a Crow middleware. We'll use a `CROW_CATCHALL_ROUTE` or explicit try/catch.
}

void App::setupRoutes() {
    LOG_DEBUG("Setting up API routes.");

    // Public routes (Auth)
    CROW_ROUTE(crow_app, "/api/v1/auth/register").methods("POST"_method)(
        std::bind(&tm_api::auth::AuthController::registerUser, authController.get(), std::placeholders::_1)
    );
    CROW_ROUTE(crow_app, "/api/v1/auth/login").methods("POST"_method)(
        std::bind(&tm_api::auth::AuthController::loginUser, authController.get(), std::placeholders::_1)
    );

    // Protected routes (User & Task)
    // Apply AuthMiddleware to these routes.
    // In Crow, this is done by chaining middlewares for specific routes/groups.

    // Users
    auto& users_group = crow_app.group("/api/v1/users");

    users_group.GET("/<string>", authMiddleware->validate_middleware(
        std::bind(&tm_api::users::UserController::getUserById, userController.get(), std::placeholders::_1, std::placeholders::_2)
    ));
    users_group.GET("/", authMiddleware->validate_middleware(
        std::bind(&tm_api::users::UserController::getAllUsers, userController.get(), std::placeholders::_1)
    ));
    users_group.PUT("/<string>", authMiddleware->validate_middleware(
        std::bind(&tm_api::users::UserController::updateUser, userController.get(), std::placeholders::_1, std::placeholders::_2)
    ));
    users_group.DELETE("/<string>", authMiddleware->validate_middleware(
        std::bind(&tm_api::users::UserController::deleteUser, userController.get(), std::placeholders::_1, std::placeholders::_2)
    ));

    // Tasks
    auto& tasks_group = crow_app.group("/api/v1/tasks");

    tasks_group.POST("/", authMiddleware->validate_middleware(
        std::bind(&tm_api::tasks::TaskController::createTask, taskController.get(), std::placeholders::_1)
    ));
    tasks_group.GET("/<string>", authMiddleware->validate_middleware(
        std::bind(&tm_api::tasks::TaskController::getTaskById, taskController.get(), std::placeholders::_1, std::placeholders::_2)
    ));
    tasks_group.GET("/", authMiddleware->validate_middleware(
        std::bind(&tm_api::tasks::TaskController::getAllTasks, taskController.get(), std::placeholders::_1)
    ));
    tasks_group.PUT("/<string>", authMiddleware->validate_middleware(
        std::bind(&tm_api::tasks::TaskController::updateTask, taskController.get(), std::placeholders::_1, std::placeholders::_2)
    ));
    tasks_group.DELETE("/<string>", authMiddleware->validate_middleware(
        std::bind(&tm_api::tasks::TaskController::deleteTask, taskController.get(), std::placeholders::_1, std::placeholders::_2)
    ));

    // Catch-all for 404
    CROW_ROUTE(crow_app, "/<path>")(
        [](const crow::request& req){
            return crow::response(404, tm_api::utils::ErrorHandler::toJsonError("NotFound", "The requested resource was not found.", 404));
        }
    );

    // Global Error Handler (using CROW_CATCHALL_ROUTE is one way, or custom global handler)
    // For simplicity, we'll rely on explicit try/catch in controllers or a higher level catch.
    // The ErrorMiddleware will primarily focus on formatting error responses.
    CROW_CATCHALL_ROUTE(crow_app)
    ([](crow::response& res, std::exception_ptr ep) {
        if (ep) {
            try {
                std::rethrow_exception(ep);
            } catch (const tm_api::utils::AppException& e) {
                res.code = e.getHttpStatus();
                res.write(e.toJsonError());
                LOG_WARN("Caught AppException: {}", e.what());
            } catch (const std::exception& e) {
                res.code = 500;
                res.write(tm_api::utils::ErrorHandler::toJsonError("InternalServerError", e.what(), 500));
                LOG_ERROR("Caught std::exception: {}", e.what());
            } catch (...) {
                res.code = 500;
                res.write(tm_api::utils::ErrorHandler::toJsonError("InternalServerError", "An unknown error occurred.", 500));
                LOG_ERROR("Caught unknown exception.");
            }
        }
        res.add_header("Content-Type", "application/json");
        res.end();
    });
}
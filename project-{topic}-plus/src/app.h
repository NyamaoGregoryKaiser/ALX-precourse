#pragma once

#include <crow.h>

// Forward declarations for controllers to avoid circular includes
namespace tm_api {
    namespace auth { class AuthController; }
    namespace users { class UserController; }
    namespace tasks { class TaskController; }
}

// Forward declarations for middlewares
namespace tm_api {
    namespace middleware {
        class AuthMiddleware;
        class ErrorMiddleware;
        class LogMiddleware;
    }
}


class App {
public:
    App();
    void run(int port);

private:
    crow::SimpleApp crow_app;

    // Controllers
    std::unique_ptr<tm_api::auth::AuthController> authController;
    std::unique_ptr<tm_api::users::UserController> userController;
    std::unique_ptr<tm_api::tasks::TaskController> taskController;

    // Middlewares
    std::unique_ptr<tm_api::middleware::AuthMiddleware> authMiddleware;
    std::unique_ptr<tm_api::middleware::ErrorMiddleware> errorMiddleware;
    std::unique_ptr<tm_api::middleware::LogMiddleware> logMiddleware;

    void setupRoutes();
    void setupMiddlewares();
};
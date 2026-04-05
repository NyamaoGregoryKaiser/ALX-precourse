```cpp
#include "crow.h"
#include "config/Config.hpp"
#include "logger/Logger.hpp"
#include "database/Database.hpp"
#include "auth/AuthService.hpp"
#include "auth/JwtManager.hpp"
#include "services/UserService.hpp"
#include "services/TaskService.hpp"
#include "services/CacheService.hpp"
#include "middleware/ErrorHandlerMiddleware.hpp"
#include "middleware/AuthMiddleware.hpp"
#include "middleware/RateLimitMiddleware.hpp"
#include "controllers/AuthController.hpp"
#include "controllers/UserController.hpp"
#include "controllers/TaskController.hpp"
#include "utils/CryptoUtils.hpp"

#include <iostream>
#include <string>
#include <memory>
#include <chrono>

// Global instances for services and managers
std::unique_ptr<Database> db;
std::unique_ptr<JwtManager> jwtManager;
std::unique_ptr<AuthService> authService;
std::unique_ptr<UserService> userService;
std::unique_ptr<TaskService> taskService;
std::unique_ptr<CacheService> cacheService;

void setupGlobalServices() {
    db = std::make_unique<Database>(Config::get("DATABASE_PATH"));
    db->connect();

    jwtManager = std::make_unique<JwtManager>(Config::get("JWT_SECRET_KEY"), std::stoi(Config::get("JWT_EXPIRATION_SECONDS")));
    
    // CryptoUtils doesn't need to be unique_ptr if all methods are static
    // or passed as dependency. For now, it's used statically.

    authService = std::make_unique<AuthService>(*db, *jwtManager);
    userService = std::make_unique<UserService>(*db);
    taskService = std::make_unique<TaskService>(*db);
    cacheService = std::make_unique<CacheService>(std::stoi(Config::get("CACHE_TTL_SECONDS")));
}

// Function to bootstrap the admin user if it's a placeholder
void bootstrapAdminUser() {
    std::string adminUsername = Config::get("ADMIN_USERNAME");
    std::string adminPassword = Config::get("ADMIN_PASSWORD"); // Plain text from .env
    std::string adminEmail = "admin@example.com"; // Default for bootstrap

    // Attempt to find the admin user
    std::optional<User> adminUserOpt = userService->findByUsername(adminUsername);

    if (!adminUserOpt) {
        // Admin user does not exist, create it.
        Logger::info("Bootstrapping admin user: {}", adminUsername);
        try {
            // Hash the admin password using the same logic as registration
            std::string hashedPassword = CryptoUtils::hashPassword(adminPassword);
            User newAdmin(0, adminUsername, hashedPassword, adminEmail, "admin");
            userService->createUser(newAdmin);
            Logger::info("Admin user '{}' created successfully.", adminUsername);
        } catch (const std::exception& e) {
            Logger::error("Failed to create admin user '{}': {}", adminUsername, e.what());
        }
    } else {
        // Admin user exists, check if password hash is placeholder or needs update
        User& adminUser = adminUserOpt.value();
        if (adminUser.getPasswordHash() == "_PLACEHOLDER_FOR_ADMIN_PASSWORD_HASH_") {
            Logger::info("Admin user '{}' has placeholder password hash. Updating...", adminUsername);
            try {
                std::string newHashedPassword = CryptoUtils::hashPassword(adminPassword);
                adminUser.setPasswordHash(newHashedPassword);
                userService->updateUser(adminUser.getId(), adminUser);
                Logger::info("Admin user '{}' password hash updated successfully.", adminUsername);
            } catch (const std::exception& e) {
                Logger::error("Failed to update admin user '{}' password hash: {}", adminUsername, e.what());
            }
        } else {
             Logger::info("Admin user '{}' already exists with a valid password hash.", adminUsername);
        }
    }
}


int main() {
    // 1. Load Configuration
    Config::load(".env");
    
    // 2. Setup Logger
    Logger::setup(
        Config::get("LOG_FILE"), 
        Logger::stringToLevel(Config::get("LOG_LEVEL")), 
        Config::get("APP_ENV") == "production"
    );
    Logger::info("Application started. Environment: {}", Config::get("APP_ENV"));

    // 3. Setup Global Services
    setupGlobalServices();

    // 4. Bootstrap Admin User (ensures admin exists with hashed password)
    bootstrapAdminUser();

    // 5. Initialize Crow Application
    crow::App<
        ErrorHandlerMiddleware,
        RateLimitMiddleware,
        AuthMiddleware
    > app;

    // Set middleware configurations
    app.get_middleware<RateLimitMiddleware>().configure(
        Config::get("RATE_LIMIT_ENABLED") == "true",
        std::stoi(Config::get("RATE_LIMIT_REQUESTS")),
        std::stoi(Config::get("RATE_LIMIT_WINDOW_SECONDS"))
    );

    // 6. Register Controllers
    AuthController authController(*authService, *userService);
    UserController userController(*userService);
    TaskController taskController(*taskService, *userService);

    // Public routes (no authentication required)
    CROW_ROUTE(app, "/health")([](){
        return crow::response(200, "{\"status\": \"success\", \"message\": \"API is healthy\"}");
    });
    CROW_ROUTE(app, "/auth/register").methods("POST"_method)(
        [&](const crow::request& req) { return authController.registerUser(req); }
    );
    CROW_ROUTE(app, "/auth/login").methods("POST"_method)(
        [&](const crow::request& req) { return authController.loginUser(req); }
    );

    // Protected API routes (authentication required via AuthMiddleware)
    // Routes accessible by any authenticated user
    CROW_ROUTE(app, "/api/v1/users/me").methods("GET"_method)(
        [&](const crow::request& req) { return userController.getAuthenticatedUser(req); }
    );
    CROW_ROUTE(app, "/api/v1/users/me").methods("PUT"_method)(
        [&](const crow::request& req) { return userController.updateAuthenticatedUser(req); }
    );
    CROW_ROUTE(app, "/api/v1/users/me").methods("DELETE"_method)(
        [&](const crow::request& req) { return userController.deleteAuthenticatedUser(req); }
    );

    CROW_ROUTE(app, "/api/v1/tasks").methods("POST"_method)(
        [&](const crow::request& req) { return taskController.createTask(req); }
    );
    CROW_ROUTE(app, "/api/v1/tasks").methods("GET"_method)(
        [&](const crow::request& req) { return taskController.getTasks(req); }
    );
    CROW_ROUTE(app, "/api/v1/tasks/<int>").methods("GET"_method)(
        [&](const crow::request& req, int task_id) { return taskController.getTaskById(req, task_id); }
    );
    CROW_ROUTE(app, "/api/v1/tasks/<int>").methods("PUT"_method)(
        [&](const crow::request& req, int task_id) { return taskController.updateTask(req, task_id); }
    );
    CROW_ROUTE(app, "/api/v1/tasks/<int>").methods("DELETE"_method)(
        [&](const crow::request& req, int task_id) { return taskController.deleteTask(req, task_id); }
    );

    // Admin-only routes (AuthMiddleware will set user role, controller checks it)
    CROW_ROUTE(app, "/api/v1/users").methods("GET"_method)(
        [&](const crow::request& req) { return userController.getAllUsers(req); }
    );
    // Add more admin routes if needed

    // 7. Run the application
    int port = std::stoi(Config::get("APP_PORT"));
    Logger::info("Server starting on port {}", port);
    app.port(port).multithreaded().run();

    Logger::info("Application shut down.");
    db->disconnect(); // Ensure database connection is closed
    return 0;
}
```
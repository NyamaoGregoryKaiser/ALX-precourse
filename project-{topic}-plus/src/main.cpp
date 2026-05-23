#include <crow.h>
#include <iostream>
#include "config/AppConfig.h"
#include "logger/Logger.h"
#include "database/DBManager.h"
#include "middleware/ErrorHandlingMiddleware.h"
#include "middleware/LoggingMiddleware.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/RateLimitingMiddleware.h"

// Controllers
#include "controllers/AuthController.h"
#include "controllers/UserController.h"
// #include "controllers/ProductController.h" // Uncomment and implement
// #include "controllers/OrderController.h"   // Uncomment and implement

int main() {
    // 1. Initialize Logger
    try {
        Logger::init_logger(AppConfig::get_instance().log_level);
        Logger::get_logger()->info("Starting E-commerce C++ application...");
    } catch (const std::exception& e) {
        std::cerr << "CRITICAL: Failed to initialize logger or load configuration: " << e.what() << std::endl;
        return 1; // Exit if logging/config fails
    }

    // 2. Load Configuration (already done by AppConfig::get_instance() in Logger init)
    const AppConfig& config = AppConfig::get_instance();
    Logger::get_logger()->info("Application configured to run on {}:{}", config.server_host, config.server_port);

    // 3. Initialize Database Manager (and connection pool)
    try {
        DBManager::get_instance(); // Call to initialize the singleton and its pool
        Logger::get_logger()->info("Database manager initialized.");
    } catch (const DatabaseException& e) {
        Logger::get_logger()->critical("Database initialization failed: {}", e.what());
        return 1;
    } catch (const std::exception& e) {
        Logger::get_logger()->critical("Unknown error during database initialization: {}", e.what());
        return 1;
    }

    // 4. Setup Crow App
    crow::App<LoggingMiddleware, RateLimitingMiddleware, AuthMiddleware> app;

    // 5. Setup global error handler
    ErrorHandlingMiddleware::setup_error_handler(app);

    // 6. Initialize Controllers
    AuthController auth_controller;
    UserController user_controller;
    // ProductController product_controller;
    // OrderController order_controller;

    // 7. Define API Routes

    // Health Check
    CROW_ROUTE(app, "/")([](){
        return "E-commerce C++ API is running!";
    });

    // Authentication Routes
    CROW_ROUTE(app, "/api/v1/auth/register").methods(crow::HTTPMethod::POST)
    ([&](const crow::request& req){
        return auth_controller.registerUser(req);
    });

    CROW_ROUTE(app, "/api/v1/auth/login").methods(crow::HTTPMethod::POST)
    ([&](const crow::request& req){
        return auth_controller.loginUser(req);
    });

    // User Routes (protected by AuthMiddleware)
    // Get all users (Admin only)
    CROW_ROUTE(app, "/api/v1/users").middlewares<AuthMiddleware>(AuthMiddleware::AuthContext)
    ([&](const crow::request& req, AuthMiddleware::AuthContext& ctx){
        return user_controller.getAllUsers(req, ctx);
    });

    // Get user by ID (Authenticated or Admin)
    CROW_ROUTE(app, "/api/v1/users/<string>").middlewares<AuthMiddleware>(AuthMiddleware::AuthContext)
    ([&](const crow::request& req, AuthMiddleware::AuthContext& ctx, const std::string& user_id){
        return user_controller.getUserById(req, ctx, user_id);
    });

    // Update user by ID (Owner or Admin)
    CROW_ROUTE(app, "/api/v1/users/<string>").methods(crow::HTTPMethod::PUT).middlewares<AuthMiddleware>(AuthMiddleware::AuthContext)
    ([&](const crow::request& req, AuthMiddleware::AuthContext& ctx, const std::string& user_id){
        return user_controller.updateUser(req, ctx, user_id);
    });

    // Delete user by ID (Admin only)
    CROW_ROUTE(app, "/api/v1/users/<string>").methods(crow::HTTPMethod::DELETE).middlewares<AuthMiddleware>(AuthMiddleware::AuthContext)
    ([&](const crow::request& req, AuthMiddleware::AuthContext& ctx, const std::string& user_id){
        return user_controller.deleteUser(req, ctx, user_id);
    });

    // Product Routes (conceptual - would follow similar pattern)
    // CROW_ROUTE(app, "/api/v1/products").methods(crow::HTTPMethod::POST).middlewares<AuthMiddleware>(AuthMiddleware::AuthContext)
    // ([](const crow::request& req, AuthMiddleware::AuthContext& ctx){
    //     if (!AuthMiddleware::has_role(ctx, UserRole::ADMIN)) {
    //         return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: Admin role required.", 403, "FORBIDDEN").dump());
    //     }
    //     // return product_controller.createProduct(req);
    //     return crow::response(200, "Create product (Admin only)");
    // });
    // ... other product routes

    // Order Routes (conceptual - would follow similar pattern)
    // CROW_ROUTE(app, "/api/v1/orders").methods(crow::HTTPMethod::POST).middlewares<AuthMiddleware>(AuthMiddleware::AuthContext)
    // ([](const crow::request& req, AuthMiddleware::AuthContext& ctx){
    //      // Check if user is authenticated and is a CUSTOMER
    //     if (!AuthMiddleware::has_role(ctx, UserRole::CUSTOMER)) {
    //         return crow::response(403, ErrorHandlingMiddleware::create_error_response("Forbidden: Customer role required to create orders.", 403, "FORBIDDEN").dump());
    //     }
    //     // return order_controller.createOrder(req, ctx.authenticated_claims->user_id);
    //     return crow::response(200, "Create order (Customer)");
    // });
    // ... other order routes

    // 8. Run the application
    Logger::get_logger()->info("Server starting on {}:{}", config.server_host, config.server_port);
    app.port(config.server_port).multithreaded().run();

    Logger::get_logger()->info("Application stopped.");
    return 0;
}
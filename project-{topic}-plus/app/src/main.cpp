#include <iostream>
#include <crow.h>
#include <crow/middlewares/cors.h> // For CORS support if frontend is separate
#include <csignal> // For signal handling

#include "app_config.h"
#include "utils/Logger.h"
#include "utils/Database.h"
#include "utils/ErrorHandler.h"
#include "utils/Middleware.h" // Includes Auth, Logging, RateLimit middleware

// Services
#include "services/UserService.h"
#include "services/ProductService.h"
#include "services/AuthService.h"

// Controllers
#include "controllers/AuthController.h"
#include "controllers/UserController.h"
#include "controllers/ProductController.h"

// Global flag to indicate if application should shut down
volatile sig_atomic_t shutdown_requested = 0;

// Signal handler function
void signal_handler(int signal) {
    if (signal == SIGINT || signal == SIGTERM) {
        LOG_INFO("Shutdown signal received ({}). Initiating graceful shutdown.", signal);
        shutdown_requested = 1;
    }
}

int main() {
    // 1. Initialize Logger
    Logger::init();
    LOG_INFO("{} application starting...", AppConfig::APP_NAME);
    LOG_INFO("Running in {} environment.", AppConfig::APP_ENV);

    // 2. Register signal handlers for graceful shutdown
    std::signal(SIGINT, signal_handler);  // Ctrl+C
    std::signal(SIGTERM, signal_handler); // kill command

    // 3. Initialize Database (singleton)
    Database& db = Database::getInstance();
    // The Database constructor already pre-fills the pool and sets PRAGMA.
    LOG_INFO("Database connected successfully at path: {}", AppConfig::DATABASE_PATH);

    // 4. Initialize Services
    UserService user_service(db);
    ProductService product_service(db);
    AuthService auth_service(user_service); // AuthService depends on UserService

    // 5. Initialize Controllers
    AuthController auth_controller(auth_service);
    UserController user_controller(user_service);
    ProductController product_controller(product_service);

    // 6. Setup Crow application
    // Use the combined middleware for Crow to apply error handling globally
    crow::App<
        ErrorHandlerMiddleware,
        LoggingMiddleware,
        RateLimitMiddleware,
        AuthMiddleware, // AuthMiddleware must run before any role/auth checks
        crow::CORSHandler // Optional: for web frontends
    > app;

    // Configure CORS if needed
    // app.get_middleware<crow::CORSHandler>()
    //    .global()
    //    .allow_origin("*") // For development, specific origins for production
    //    .allow_methods("GET,POST,PUT,DELETE,PATCH")
    //    .allow_headers("Authorization,Content-Type");

    // 7. Define Routes

    // Health Check Endpoint
    CROW_ROUTE(app, "/health")
    ([](crow::response& res) {
        res.code = crow::status::OK;
        res.set_header("Content-Type", "application/json");
        res.write("{\"status\": \"UP\", \"service\": \"" + AppConfig::APP_NAME + "\"}");
        res.end();
    });

    // --- Authentication Routes ---
    CROW_ROUTE(app, "/auth/register")
        .methods("POST"_method)
        ([&](const crow::request& req, crow::response& res) {
            auth_controller.registerUser(req, res);
        });

    CROW_ROUTE(app, "/auth/login")
        .methods("POST"_method)
        ([&](const crow::request& req, crow::response& res) {
            auth_controller.loginUser(req, res);
        });

    // --- User Routes (Protected) ---
    CROW_ROUTE(app, "/users/me")
        .methods("GET"_method)
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx) {
            user_controller.getMe(req, res, ctx);
        });

    CROW_ROUTE(app, "/users/me")
        .methods("PUT"_method)
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx) {
            user_controller.updateMe(req, res, ctx);
        });

    CROW_ROUTE(app, "/users/<int>") // Admin only
        .methods("GET"_method)
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
            user_controller.getUserById(req, res, ctx, id);
        });

    CROW_ROUTE(app, "/users/<int>") // Admin only
        .methods("DELETE"_method)
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
            user_controller.deleteUser(req, res, ctx, id);
        });
    
    // --- Product Routes (Protected) ---
    CROW_ROUTE(app, "/products")
        .methods("POST"_method) // Admin only
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx) {
            product_controller.createProduct(req, res, ctx);
        });

    CROW_ROUTE(app, "/products")
        .methods("GET"_method) // Any authenticated user
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx) {
            product_controller.getAllProducts(req, res, ctx);
        });
    
    CROW_ROUTE(app, "/products/<int>")
        .methods("GET"_method) // Any authenticated user
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
            product_controller.getProductById(req, res, ctx, id);
        });

    CROW_ROUTE(app, "/products/<int>")
        .methods("PUT"_method) // Admin only
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
            product_controller.updateProduct(req, res, ctx, id);
        });

    CROW_ROUTE(app, "/products/<int>")
        .methods("DELETE"_method) // Admin only
        ([&](const crow::request& req, crow::response& res, AuthMiddleware::context& ctx, long long id) {
            product_controller.deleteProduct(req, res, ctx, id);
        });

    // Add a periodic cleanup for RateLimiter (e.g., every 5 minutes)
    app.get_io_context().post([&]() {
        asio::steady_timer timer(app.get_io_context());
        std::function<void()> periodic_cleanup = [&]() {
            RateLimiting::app_rate_limiter.cleanupExpiredWindows();
            Cache::app_cache.prune();
            timer.expires_at(timer.expiry() + std::chrono::minutes(5));
            timer.async_wait([&](const asio::error_code& error) {
                if (!error) {
                    periodic_cleanup();
                } else {
                    LOG_ERROR("Periodic cleanup timer error: {}", error.message());
                }
            });
        };
        periodic_cleanup();
    });


    // 8. Run the application
    LOG_INFO("Application listening on port {}", AppConfig::APP_PORT);
    app.port(AppConfig::APP_PORT).multithreaded().run();

    // 9. Graceful shutdown
    LOG_INFO("Application shut down gracefully.");
    return 0;
}
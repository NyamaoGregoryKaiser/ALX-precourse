```cpp
#include "crow.h"
#include "config/AppConfig.hpp"
#include "utils/Logger.hpp"
#include "database/SQLiteDatabaseManager.hpp"
#include "controllers/APIController.hpp"
#include "utils/ErrorHandler.hpp"
#include "middleware/RateLimitMiddleware.hpp" // Include Rate Limit Middleware

#include <iostream>
#include <memory>
#include <stdexcept>

int main() {
    // 1. Initialize Configuration
    AppConfig::loadConfig(".env"); // Load configuration from .env file

    // 2. Initialize Logger
    Logger::init(static_cast<LogLevel>(std::stoi(AppConfig::get("LOG_LEVEL", "2")))); // Default to INFO
    Logger::log(LogLevel::INFO, "Application starting up...");

    // 3. Initialize Database
    std::string db_path = AppConfig::get("DATABASE_PATH", "db/alx_project_management.db");
    std::shared_ptr<SQLiteDatabaseManager> db_manager;
    try {
        db_manager = std::make_shared<SQLiteDatabaseManager>(db_path);
        Logger::log(LogLevel::INFO, "Database initialized successfully at " + db_path);
    } catch (const CustomException& e) {
        Logger::log(LogLevel::CRITICAL, "Database initialization failed: " + std::string(e.what()));
        return 1; // Exit if database can't be initialized
    } catch (const std::exception& e) {
        Logger::log(LogLevel::CRITICAL, "Unhandled exception during database initialization: " + std::string(e.what()));
        return 1;
    }

    // 4. Initialize Crow App
    crow::App<crow::CORSHandler> app; // Enable CORS by default

    // 5. Initialize API Controller and inject dependencies
    // Dependencies: DatabaseManager, Logger, JWTManager, CachingManager, RateLimiter
    std::string jwt_secret = AppConfig::get("JWT_SECRET", "super_secret_jwt_key_please_change");
    int jwt_expiry_minutes = std::stoi(AppConfig::get("JWT_EXPIRY_MINUTES", "60"));
    JWTManager jwt_manager(jwt_secret, jwt_expiry_minutes);

    std::shared_ptr<CachingManager> cache_manager = std::make_shared<CachingManager>();

    int rate_limit_window_seconds = std::stoi(AppConfig::get("RATE_LIMIT_WINDOW_SECONDS", "60"));
    int rate_limit_max_requests = std::stoi(AppConfig::get("RATE_LIMIT_MAX_REQUESTS", "100"));
    std::shared_ptr<RateLimiter> rate_limiter = std::make_shared<RateLimiter>(rate_limit_window_seconds, rate_limit_max_requests);
    
    // Instantiate middlewares
    AuthMiddleware auth_middleware(jwt_manager);
    RateLimitMiddleware limit_middleware(rate_limiter);

    // Create APIController instance and inject dependencies
    APIController api_controller(
        db_manager,
        jwt_manager,
        cache_manager,
        auth_middleware,
        limit_middleware
    );

    // 6. Register Routes
    api_controller.registerRoutes(app);

    // 7. Error Handling Middleware (Crow's built-in error handling)
    // Custom error pages can be set like this:
    app.error_handler = [](crow::response& res) {
        res.set_header("Content-Type", "application/json");
        if (res.code >= 400 && res.code < 500) {
            res.write(JSONConverter::toJSON({{"error", res.reason}}).dump());
        } else if (res.code >= 500) {
            res.write(JSONConverter::toJSON({{"error", "Internal Server Error"}}).dump());
        } else {
             res.write(JSONConverter::toJSON({{"error", "Unknown Error"}}).dump());
        }
        res.end();
    };

    // Global exception handler for uncaught exceptions
    std::set_terminate([]() {
        try {
            std::exception_ptr eptr = std::current_exception();
            if (eptr) {
                std::rethrow_exception(eptr);
            }
        } catch (const std::exception& e) {
            Logger::log(LogLevel::CRITICAL, "Unhandled exception caught by terminate handler: " + std::string(e.what()));
        } catch (...) {
            Logger::log(LogLevel::CRITICAL, "Unknown unhandled exception caught by terminate handler.");
        }
        // Force flush logs before exiting
        Logger::log(LogLevel::CRITICAL, "Application is terminating.");
        std::abort();
    });

    // 8. Start Server
    int port = std::stoi(AppConfig::get("APP_PORT", "18080"));
    Logger::log(LogLevel::INFO, "Server starting on port " + std::to_string(port));
    app.port(port).multithreaded().run();

    Logger::log(LogLevel::INFO, "Application shut down gracefully.");
    return 0;
}
```
#include "crow.h"
#include "config/AppConfig.h"
#include "utils/Logger.h"
#include "database/DatabaseManager.h"
#include "services/AuthService.h"
#include "services/ScrapingService.h"
#include "services/SchedulerService.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/ErrorMiddleware.h"
#include "middleware/RateLimitMiddleware.h"
#include "controllers/AuthController.h"
#include "controllers/ScrapeJobController.h"
#include "controllers/ScrapedItemController.h"
#include "cache/CacheManager.h"

#include <iostream>
#include <memory>
#include <string>

int main() {
    // 1. Load configuration
    if (!AppConfig::load()) {
        LOG_CRITICAL("Failed to load application configuration. Exiting.");
        return 1;
    }

    LOG_INFO("Application configuration loaded successfully.");

    // 2. Initialize Logger
    Logger::init();
    LOG_INFO("Logger initialized.");

    // 3. Initialize Database Manager
    try {
        DatabaseManager::init(AppConfig::get_instance().get_db_connection_string());
        LOG_INFO("Database connection pool initialized.");
    } catch (const std::exception& e) {
        LOG_CRITICAL("Failed to initialize database: {}", e.what());
        return 1;
    }

    // 4. Initialize Cache Manager (Redis)
    try {
        CacheManager::init(AppConfig::get_instance().get_redis_host(), AppConfig::get_instance().get_redis_port());
        LOG_INFO("Redis Cache Manager initialized.");
    } catch (const std::exception& e) {
        LOG_WARNING("Failed to initialize Redis Cache Manager: {}. Caching/Rate limiting might be affected.", e.what());
    }

    // 5. Initialize Services
    AuthService auth_service;
    ScrapingService scraping_service; // Depends on CacheManager
    SchedulerService scheduler_service(scraping_service, AppConfig::get_instance().get_scheduler_interval_seconds());
    scheduler_service.start(); // Start background scraping scheduler

    // 6. Setup Crow Application
    crow::App<
        crow::AuthMiddleware,
        crow::ErrorMiddleware,
        crow::RateLimitMiddleware
    > app;

    // Apply global middleware configurations
    app.template get_middleware<crow::AuthMiddleware>().set_secret(AppConfig::get_instance().get_jwt_secret());
    app.template get_middleware<crow::RateLimitMiddleware>().set_redis_connection(
        AppConfig::get_instance().get_redis_host(),
        AppConfig::get_instance().get_redis_port(),
        AppConfig::get_instance().get_rate_limit_requests(),
        AppConfig::get_instance().get_rate_limit_window_seconds()
    );

    // 7. Register Controllers (API Endpoints)
    AuthController::register_routes(app, auth_service);
    ScrapeJobController::register_routes(app, scraping_service);
    ScrapedItemController::register_routes(app, scraping_service);

    // Serve static files for the frontend (optional, for simple integration)
    CROW_ROUTE(app, "/")([](){
        crow::response res;
        res.set_static_file_info(crow::utility::get_current_directory() + "/frontend/index.html");
        return res;
    });
    CROW_ROUTE(app, "/<path>")([](const crow::request& req, crow::response& res, const std::string& path){
        std::string full_path = crow::utility::get_current_directory() + "/frontend/" + path;
        res.set_static_file_info(full_path);
        return res;
    });

    // 8. Start the server
    LOG_INFO("Starting Crow server on port {}.", AppConfig::get_instance().get_port());
    app.port(AppConfig::get_instance().get_port()).multithreaded().run();

    // Cleanup (though typically not reached in a server app without shutdown signals)
    scheduler_service.stop();
    LOG_INFO("Server stopped.");
    return 0;
}
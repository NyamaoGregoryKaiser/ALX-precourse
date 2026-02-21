```cpp
#include <crow.h>
#include <iostream>
#include <stdexcept>
#include <string>

#include "config/AppConfig.h"
#include "database/DbConnection.h"
#include "utils/Logger.h"
#include "utils/Crypto.h" // For JWT secret setup
#include "services/CacheService.h"
#include "services/RateLimiter.h"

// Controllers
#include "controllers/AuthController.h"
#include "controllers/UserController.h"
#include "controllers/SystemController.h"
#include "controllers/MetricController.h"
#include "controllers/AlertController.h"

// Middleware
#include "middleware/AuthMiddleware.h"
#include "middleware/ErrorMiddleware.h"

int main() {
    // 1. Initialize Logger
    Logger::init();
    LOG_INFO("Application starting...");

    // 2. Load Configuration
    try {
        AppConfig::load_config(".env"); // Load from .env file
        LOG_INFO("Configuration loaded successfully.");
    } catch (const std::runtime_error& e) {
        LOG_ERROR("Failed to load configuration: {}", e.what());
        return 1;
    }

    // 3. Initialize Database Connection Pool
    try {
        DbConnection::init_pool(
            AppConfig::get_db_host(),
            AppConfig::get_db_port(),
            AppConfig::get_db_name(),
            AppConfig::get_db_user(),
            AppConfig::get_db_password(),
            AppConfig::get_db_pool_size()
        );
        LOG_INFO("Database connection pool initialized.");

        // Apply migrations
        DbConnection::apply_migrations();
        LOG_INFO("Database migrations applied.");

        // Seed data
        DbConnection::seed_data();
        LOG_INFO("Database seed data applied (if any).");

    } catch (const pqxx::sql_error& e) {
        LOG_CRITICAL("Database SQL Error: {}. Query: {}", e.what(), e.query());
        return 1;
    } catch (const std::exception& e) {
        LOG_CRITICAL("Database Initialization Error: {}", e.what());
        return 1;
    }

    // 4. Initialize Cache Service
    CacheService::init(AppConfig::get_cache_capacity(), AppConfig::get_cache_ttl());
    LOG_INFO("Cache service initialized with capacity {} and TTL {}s.",
             AppConfig::get_cache_capacity(), AppConfig::get_cache_ttl());

    // 5. Initialize Rate Limiter
    RateLimiter::init(AppConfig::get_rate_limit_max_requests(), AppConfig::get_rate_limit_window_seconds());
    LOG_INFO("Rate Limiter initialized with max_requests {} and window {}s.",
             AppConfig::get_rate_limit_max_requests(), AppConfig::get_rate_limit_window_seconds());
    
    // 6. Set JWT Secret
    Crypto::set_jwt_secret(AppConfig::get_jwt_secret());
    LOG_INFO("JWT secret set.");

    // 7. Crow Application Setup
    crow::App<AuthMiddleware, ErrorMiddleware> app;

    // Controllers initialization (passing DbConnection for service instantiation)
    AuthController authController(DbConnection::get_pool());
    UserController userController(DbConnection::get_pool());
    SystemController systemController(DbConnection::get_pool());
    MetricController metricController(DbConnection::get_pool());
    AlertController alertController(DbConnection::get_pool());

    // Public Routes (no authentication required)
    CROW_ROUTE(app, "/api/v1/auth/register").methods(crow::HTTPMethod::POST)(
        [&authController](const crow::request& req) {
            return authController.registerUser(req);
        }
    );
    CROW_ROUTE(app, "/api/v1/auth/login").methods(crow::HTTPMethod::POST)(
        [&authController](const crow::request& req) {
            return authController.loginUser(req);
        }
    );

    // Authenticated Routes (require JWT token)
    // User Management
    CROW_ROUTE(app, "/api/v1/users/<string>").methods(crow::HTTPMethod::GET)(
        [&userController](const crow::request& req, const std::string& userId) {
            return userController.getUser(req, userId);
        }
    );
    CROW_ROUTE(app, "/api/v1/users/<string>").methods(crow::HTTPMethod::PUT)(
        [&userController](const crow::request& req, const std::string& userId) {
            return userController.updateUser(req, userId);
        }
    );
    CROW_ROUTE(app, "/api/v1/users/<string>").methods(crow::HTTPMethod::DELETE)(
        [&userController](const crow::request& req, const std::string& userId) {
            return userController.deleteUser(req, userId);
        }
    );

    // System Management
    CROW_ROUTE(app, "/api/v1/systems").methods(crow::HTTPMethod::POST)(
        [&systemController](const crow::request& req) {
            return systemController.createSystem(req);
        }
    );
    CROW_ROUTE(app, "/api/v1/systems").methods(crow::HTTPMethod::GET)(
        [&systemController](const crow::request& req) {
            return systemController.getSystems(req);
        }
    );
    CROW_ROUTE(app, "/api/v1/systems/<string>").methods(crow::HTTPMethod::GET)(
        [&systemController](const crow::request& req, const std::string& systemId) {
            return systemController.getSystem(req, systemId);
        }
    );
    CROW_ROUTE(app, "/api/v1/systems/<string>").methods(crow::HTTPMethod::PUT)(
        [&systemController](const crow::request& req, const std::string& systemId) {
            return systemController.updateSystem(req, systemId);
        }
    );
    CROW_ROUTE(app, "/api/v1/systems/<string>").methods(crow::HTTPMethod::DELETE)(
        [&systemController](const crow::request& req, const std::string& systemId) {
            return systemController.deleteSystem(req, systemId);
        }
    );

    // Metric Ingestion and Retrieval
    CROW_ROUTE(app, "/api/v1/systems/<string>/metrics").methods(crow::HTTPMethod::POST)(
        [&metricController](const crow::request& req, const std::string& systemId) {
            return metricController.ingestMetric(req, systemId);
        }
    );
    CROW_ROUTE(app, "/api/v1/systems/<string>/metrics").methods(crow::HTTPMethod::GET)(
        [&metricController](const crow::request& req, const std::string& systemId) {
            return metricController.getMetrics(req, systemId);
        }
    );
    CROW_ROUTE(app, "/api/v1/systems/<string>/metrics/latest").methods(crow::HTTPMethod::GET)(
        [&metricController](const crow::request& req, const std::string& systemId) {
            return metricController.getLatestMetrics(req, systemId);
        }
    );
    CROW_ROUTE(app, "/api/v1/systems/<string>/metrics/aggregate").methods(crow::HTTPMethod::GET)(
        [&metricController](const crow::request& req, const std::string& systemId) {
            return metricController.getAggregatedMetrics(req, systemId);
        }
    );

    // Alert Management
    CROW_ROUTE(app, "/api/v1/alerts").methods(crow::HTTPMethod::POST)(
        [&alertController](const crow::request& req) {
            return alertController.createAlert(req);
        }
    );
    CROW_ROUTE(app, "/api/v1/alerts").methods(crow::HTTPMethod::GET)(
        [&alertController](const crow::request& req) {
            return alertController.getAlerts(req);
        }
    );
    CROW_ROUTE(app, "/api/v1/alerts/<string>").methods(crow::HTTPMethod::GET)(
        [&alertController](const crow::request& req, const std::string& alertId) {
            return alertController.getAlert(req, alertId);
        }
    );
    CROW_ROUTE(app, "/api/v1/alerts/<string>").methods(crow::HTTPMethod::PUT)(
        [&alertController](const crow::request& req, const std::string& alertId) {
            return alertController.updateAlert(req, alertId);
        }
    );
    CROW_ROUTE(app, "/api/v1/alerts/<string>").methods(crow::HTTPMethod::DELETE)(
        [&alertController](const crow::request& req, const std::string& alertId) {
            return alertController.deleteAlert(req, alertId);
        }
    );

    // Error handling middleware is automatically applied by Crow
    // Auth middleware is automatically applied by Crow for routes defined with AuthMiddleware context

    // Set server address and port
    std::string host = AppConfig::get_app_host();
    int port = AppConfig::get_app_port();

    LOG_INFO("Server starting on {}:{}", host, port);
    app.bindandserve(port); // Binds to all interfaces by default
    // For specific host: app.bindandserve(port).host(host);

    LOG_INFO("Application shutting down.");
    DbConnection::shutdown_pool();
    return 0;
}
```
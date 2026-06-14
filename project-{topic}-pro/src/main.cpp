```cpp
#include "crow.h"
#include "config/AppConfig.h"
#include "utils/Logger.h"
#include "repositories/DatabaseManager.h"
#include "controllers/AuthController.h"
#include "controllers/MetricsController.h"
#include "controllers/UsersController.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/ErrorMiddleware.h"
#include "middleware/RateLimitMiddleware.h"
#include "agents/SystemMonitorAgent.h" // Our simulated agent
#include <iostream>
#include <stdexcept>
#include <thread>
#include <chrono>

int main() {
    // 1. Initialize Logger
    Logger::init("aurora_metrics.log");
    Logger::info("Aurora Metrics application starting...");

    // 2. Load Configuration
    try {
        AppConfig::loadConfig();
        Logger::info("Configuration loaded successfully.");
    } catch (const std::exception& e) {
        Logger::error("Failed to load configuration: {}", e.what());
        return 1;
    }

    // 3. Initialize Database Manager (and check connection)
    DatabaseManager::init(AppConfig::getDbConnectionString());
    try {
        DatabaseManager::getConnection(); // Test connection
        Logger::info("Database connection established.");
    } catch (const std::exception& e) {
        Logger::critical("Failed to connect to database: {}", e.what());
        return 1;
    }

    // 4. Setup Crow Application
    crow::App<AuthMiddleware, ErrorMiddleware, RateLimitMiddleware> app;

    // Set up global error handling
    app.error_handler([](crow::response& res) {
        ErrorMiddleware::handleError(res);
    });

    // 5. Initialize Controllers & Services
    // Repositories are typically passed to services, services to controllers
    UserRepository userRepo(DatabaseManager::getConnection());
    UserService userService(userRepo);
    AuthService authService(userService, AppConfig::getJwtSecret());
    AuthController authController(authService);

    MetricRepository metricRepo(DatabaseManager::getConnection());
    MetricService metricService(metricRepo);
    MetricsController metricsController(metricService);

    UsersController usersController(userService);

    // 6. Register Routes with Middleware
    // AuthMiddleware checks JWT for protected routes
    // RateLimitMiddleware applies rate limiting
    auto& auth_middleware = app.get_middleware<AuthMiddleware>();
    auth_middleware.set_jwt_manager(std::make_shared<JWTManager>(AppConfig::getJwtSecret()));

    auto& rate_limit_middleware = app.get_middleware<RateLimitMiddleware>();
    rate_limit_middleware.set_max_requests(AppConfig::getRateLimitMaxRequests());
    rate_limit_middleware.set_window_seconds(AppConfig::getRateLimitWindowSeconds());

    // Public Routes
    CROW_ROUTE(app, "/api/v1/auth/register").methods("POST"_method)(
        [&](const crow::request& req) {
            return authController.registerUser(req);
        }
    );

    CROW_ROUTE(app, "/api/v1/auth/login").methods("POST"_method)(
        [&](const crow::request& req) {
            return authController.loginUser(req);
        }
    );

    // Protected Routes (require authentication)
    CROW_BP_ROUTE(app, "/api/v1/users")
        .middleware<AuthMiddleware>() // Apply AuthMiddleware to this blueprint
        ([&](crow::blueprint& bp) {
            CROW_ROUTE(bp, "/").methods("GET"_method)(
                [&](const crow::request& req) { return usersController.getAllUsers(req); }
            );
            CROW_ROUTE(bp, "/<string>").methods("GET"_method)(
                [&](const crow::request& req, const std::string& username) { return usersController.getUserByUsername(req, username); }
            );
            CROW_ROUTE(bp, "/<string>").methods("PUT"_method)(
                [&](const crow::request& req, const std::string& username) { return usersController.updateUser(req, username); }
            );
            CROW_ROUTE(bp, "/<string>").methods("DELETE"_method)(
                [&](const crow::request& req, const std::string& username) { return usersController.deleteUser(req, username); }
            );
            CROW_ROUTE(bp, "/me").methods("GET"_method)(
                [&](const crow::request& req) { return usersController.getMe(req); }
            );
        });

    CROW_BP_ROUTE(app, "/api/v1/metrics")
        .middleware<AuthMiddleware>()
        ([&](crow::blueprint& bp) {
            CROW_ROUTE(bp, "/").methods("POST"_method)(
                [&](const crow::request& req) { return metricsController.ingestMetrics(req); }
            );
            CROW_ROUTE(bp, "/<string>").methods("GET"_method)(
                [&](const crow::request& req, const std::string& metric_name) { return metricsController.getMetricData(req, metric_name); }
            );
            CROW_ROUTE(bp, "/available").methods("GET"_method)(
                [&](const crow::request& req) { return metricsController.getAvailableMetrics(req); }
            );
            CROW_ROUTE(bp, "/aggregate/<string>").methods("GET"_method)(
                [&](const crow::request& req, const std::string& metric_name) { return metricsController.getAggregatedMetricData(req, metric_name); }
            );
        });

    // Serve static files for frontend
    CROW_ROUTE(app, "/")([](crow::response& res) {
        res.set_static_file_info("src/web/public/index.html");
        res.end();
    });

    CROW_ROUTE(app, "/<path>")([](const crow::request& req, crow::response& res, std::string path) {
        std::string full_path = "src/web/public/" + path;
        res.set_static_file_info(full_path);
        if (!res.is_static_file_set()) {
            res.code = 404;
            res.write("Not Found");
        }
        res.end();
    });


    // 7. Start System Monitoring Agent (in a separate thread)
    SystemMonitorAgent systemAgent(metricService, AppConfig::getAgentIntervalSeconds());
    std::thread agent_thread([&]() {
        systemAgent.start();
    });

    // 8. Start Crow Server
    Logger::info("Aurora Metrics server listening on port {}", AppConfig::getServerPort());
    try {
        app.port(AppConfig::getServerPort()).multithreaded().run();
    } catch (const std::exception& e) {
        Logger::critical("Crow server failed: {}", e.what());
    }

    // Clean up agent thread on shutdown
    systemAgent.stop();
    if (agent_thread.joinable()) {
        agent_thread.join();
    }

    Logger::info("Aurora Metrics application shutting down.");
    return 0;
}
```
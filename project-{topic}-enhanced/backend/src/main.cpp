#include "server/HttpServer.h"
#include "server/Router.h"
#include "server/controllers/AuthController.h"
#include "server/controllers/DataController.h"
#include "server/controllers/VisualizationController.h"
#include "server/middlewares/AuthMiddleware.h"
#include "server/middlewares/ErrorHandler.h"
#include "server/middlewares/RateLimiter.h"
#include "database/DBManager.h"
#include "utils/Logger.h"
#include "config/AppConfig.h"

#include <iostream>
#include <memory>
#include <string>

// Global configuration (could be loaded from .env)
AppConfig config;

void setup_routes(Router& router, DBManager& db_manager) {
    // Middlewares
    auto auth_middleware = std::make_shared<AuthMiddleware>();
    auto error_handler = std::make_shared<ErrorHandler>();
    auto rate_limiter = std::make_shared<RateLimiter>(100, std::chrono::seconds(60)); // 100 requests/min

    router.use(error_handler);
    router.use(rate_limiter);

    // Controllers
    AuthController auth_controller(db_manager, config.getJwtSecret());
    DataController data_controller(db_manager);
    VisualizationController viz_controller(db_manager);

    // Public routes
    router.post("/api/v1/auth/register", [&](const HttpRequest& req) {
        return auth_controller.registerUser(req);
    });
    router.post("/api/v1/auth/login", [&](const HttpRequest& req) {
        return auth_controller.loginUser(req);
    });

    // Protected routes (apply auth middleware)
    router.group("/api/v1", auth_middleware, [&](Router& group_router) {
        // Data Source CRUD
        group_router.post("/data-sources", [&](const HttpRequest& req) {
            return data_controller.createDataSource(req);
        });
        group_router.get("/data-sources", [&](const HttpRequest& req) {
            return data_controller.getDataSources(req);
        });
        group_router.get("/data-sources/:id", [&](const HttpRequest& req) {
            return data_controller.getDataSourceById(req);
        });
        group_router.put("/data-sources/:id", [&](const HttpRequest& req) {
            return data_controller.updateDataSource(req);
        });
        group_router.del("/data-sources/:id", [&](const HttpRequest& req) {
            return data_controller.deleteDataSource(req);
        });
        group_router.post("/data-sources/:id/process", [&](const HttpRequest& req) {
            return data_controller.processDataSource(req);
        }); // Example for processing, e.g., CSV upload

        // Visualization CRUD
        group_router.post("/visualizations", [&](const HttpRequest& req) {
            return viz_controller.createVisualization(req);
        });
        group_router.get("/visualizations", [&](const HttpRequest& req) {
            return viz_controller.getVisualizations(req);
        });
        group_router.get("/visualizations/:id", [&](const HttpRequest& req) {
            return viz_controller.getVisualizationById(req);
        });
        group_router.put("/visualizations/:id", [&](const HttpRequest& req) {
            return viz_controller.updateVisualization(req);
        });
        group_router.del("/visualizations/:id", [&](const HttpRequest& req) {
            return viz_controller.deleteVisualization(req);
        });
        group_router.get("/visualizations/:id/data", [&](const HttpRequest& req) {
            return viz_controller.getVisualizationData(req);
        }); // Endpoint to get actual data for rendering

        // Dashboard CRUD (similar to visualizations)
        // ... (omitted for brevity, but would follow similar patterns)
    });

    Logger::info("API routes initialized.");
}

int main() {
    Logger::init(config.getLogLevel());
    Logger::info("Starting DataVizTool Backend...");

    try {
        // Initialize Database Manager
        DBManager db_manager(config.getDbConnectionString());
        db_manager.connect();
        db_manager.initializeSchema(); // Run migrations if needed on startup
        Logger::info("Database connected and schema initialized.");

        // Initialize Router and setup routes
        Router router;
        setup_routes(router, db_manager);

        // Start HTTP Server
        unsigned short port = static_cast<unsigned short>(config.getHttpPort());
        std::string address = config.getHttpAddress();
        HttpServer server(address, port, router);

        Logger::info("HTTP Server listening on " + address + ":" + std::to_string(port));
        server.run(); // This will block until server stops
    } catch (const std::exception& e) {
        Logger::error("Application error: " + std::string(e.what()));
        return EXIT_FAILURE;
    }

    Logger::info("DataVizTool Backend stopped.");
    return EXIT_SUCCESS;
}
```cpp
#include <iostream>
#include <memory>
#include <thread>
#include <chrono>

#include "Server.h"
#include "Router.h"
#include "Controller.h"
#include "Database.h"
#include "DataProcessor.h"
#include "VisualizationEngine.h"
#include "AuthManager.h"
#include "Logger.h"
#include "Cache.h"
#include "RateLimiting.h"

// Example of a minimal CSV file for testing
void createExampleCsv(const std::string& filename) {
    std::ofstream file(filename);
    if (!file.is_open()) {
        VisGenius::LOG_ERROR("Failed to create example CSV file: {}", filename);
        return;
    }
    file << "Year,Category,Value,Region\n";
    file << "2020,Electronics,1000,North\n";
    file << "2020,Clothing,500,South\n";
    file << "2021,Electronics,1200,North\n";
    file << "2021,Clothing,600,West\n";
    file << "2021,Food,300,East\n";
    file << "2022,Electronics,1500,South\n";
    file << "2022,Clothing,700,North\n";
    file.close();
    VisGenius::LOG_INFO("Created example CSV file: {}", filename);
}

int main(int argc, char* argv[]) {
    VisGenius::Logger::getInstance().setLogLevel(VisGenius::DEBUG);
    VisGenius::Logger::getInstance().setLogFile("visgenius_server.log");
    VisGenius::LOG_INFO("VisGenius Server Starting...");

    // Create example data for testing
    createExampleCsv("data/sales_data.csv");

    // Initialize Database
    std::shared_ptr<VisGenius::Database> db;
    try {
        db = std::make_shared<VisGenius::Database>("visgenius.db");
        db->initialize();
    } catch (const VisGenius::DbException& e) {
        VisGenius::LOG_FATAL("Database initialization failed: {}", e.what());
        return 1;
    }

    // Initialize AuthManager (depends on DB)
    auto auth_manager = std::make_shared<VisGenius::AuthManager>(db);

    // Initialize DataProcessor
    auto data_processor = std::make_shared<VisGenius::DataProcessor>();

    // Initialize VisualizationEngine (depends on DataProcessor)
    auto viz_engine = std::make_shared<VisGenius::VisualizationEngine>(data_processor);

    // Initialize Caches
    auto data_cache = std::make_shared<VisGenius::Cache<VisGenius::DataTable>>();
    auto chart_cache = std::make_shared<VisGenius::Cache<VisGenius::ChartData>>();

    // Initialize Controller (depends on everything)
    auto controller = std::make_shared<VisGenius::Controller>(db, data_processor, viz_engine, auth_manager, data_cache, chart_cache);

    // Initialize Router
    auto router = std::make_shared<VisGenius::Router>(auth_manager);

    // Define Public Routes
    router->addPublicRoute("POST", "/auth/login", std::bind(&VisGenius::Controller::handleLogin, controller, std::placeholders::_1));
    router->addPublicRoute("POST", "/auth/register", std::bind(&VisGenius::Controller::handleRegister, controller, std::placeholders::_1));

    // Define Authenticated Routes
    // Data Sources
    router->addRoute("POST", "/data_sources", std::bind(&VisGenius::Controller::handleCreateDataSource, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("GET", "/data_sources", std::bind(&VisGenius::Controller::handleGetAllDataSources, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("GET", "/data_sources/{id}", std::bind(&VisGenius::Controller::handleGetDataSource, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("PUT", "/data_sources/{id}", std::bind(&VisGenius::Controller::handleUpdateDataSource, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("DELETE", "/data_sources/{id}", std::bind(&VisGenius::Controller::handleDeleteDataSource, controller, std::placeholders::_1, std::placeholders::_2));

    // Visualizations
    router->addRoute("POST", "/visualizations", std::bind(&VisGenius::Controller::handleCreateVisualization, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("GET", "/visualizations", std::bind(&VisGenius::Controller::handleGetAllVisualizations, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("GET", "/visualizations/{id}", std::bind(&VisGenius::Controller::handleGetVisualization, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("PUT", "/visualizations/{id}", std::bind(&VisGenius::Controller::handleUpdateVisualization, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("DELETE", "/visualizations/{id}", std::bind(&VisGenius::Controller::handleDeleteVisualization, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("GET", "/visualizations/{id}/data", std::bind(&VisGenius::Controller::handleGetVisualizationData, controller, std::placeholders::_1, std::placeholders::_2));

    // Dashboards
    router->addRoute("POST", "/dashboards", std::bind(&VisGenius::Controller::handleCreateDashboard, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("GET", "/dashboards", std::bind(&VisGenius::Controller::handleGetAllDashboards, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("GET", "/dashboards/{id}", std::bind(&VisGenius::Controller::handleGetDashboard, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("PUT", "/dashboards/{id}", std::bind(&VisGenius::Controller::handleUpdateDashboard, controller, std::placeholders::_1, std::placeholders::_2));
    router->addRoute("DELETE", "/dashboards/{id}", std::bind(&VisGenius::Controller::handleDeleteDashboard, controller, std::placeholders::_1, std::placeholders::_2));

    // Initialize Rate Limiter
    auto rate_limiter = std::make_shared<VisGenius::RateLimiter>(10, std::chrono::seconds(60)); // 10 requests per minute

    // Initialize and start Server
    VisGenius::Server server(8080, router, rate_limiter);
    try {
        server.start();

        // Keep main thread alive and perform background tasks (e.g., cache cleanup)
        while (true) {
            std::this_thread::sleep_for(std::chrono::minutes(1)); // Cleanup every minute
            data_cache->cleanupExpired();
            chart_cache->cleanupExpired();
            rate_limiter->cleanupExpired();
        }

        server.stop();
    } catch (const std::exception& e) {
        VisGenius::LOG_FATAL("Server encountered a fatal error: {}", e.what());
        return 1;
    }

    VisGenius::LOG_INFO("VisGenius Server Exiting.");
    return 0;
}
```
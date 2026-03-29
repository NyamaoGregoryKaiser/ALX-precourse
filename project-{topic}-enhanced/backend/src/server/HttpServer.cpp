```cpp
#include "HttpServer.h"
#include "utils/JsonUtils.h"
#include "../utils/Crypto.h" // For Crypto functions if needed directly by server setup

HttpServer::HttpServer() {
    // Initialize database connection
    db = std::make_shared<Database>();
    try {
        db->connect();
        Logger::info("Successfully connected to the database.");
    } catch (const pqxx::broken_connection& e) {
        Logger::critical("Failed to connect to database: {}", e.what());
        // Exit or throw an exception that propagates to main, causing app termination
        throw std::runtime_error("Database connection failed: " + std::string(e.what()));
    }

    // Initialize repositories
    user_repo = std::make_shared<UserRepository>(db);
    dataset_repo = std::make_shared<DatasetRepository>(db);
    visualization_repo = std::make_shared<VisualizationRepository>(db);

    // Initialize managers and processors
    dataset_manager = std::make_shared<DatasetManager>(Config::getDataStoragePath());
    data_processor = std::make_shared<DataProcessor>();

    // Initialize middleware with dependencies
    // AuthMiddleware needs user_repo to validate users and JWT secret
    auth_middleware = std::make_shared<AuthMiddleware>(user_repo, Config::getJwtSecret());
    
    // Assign dependencies to middleware (Crow specific)
    app.get_middleware<AuthMiddleware>().set_user_repository(user_repo);
    app.get_middleware<AuthMiddleware>().set_jwt_secret(Config::getJwtSecret());

    Logger::info("HTTP server initialized. Port: {}", Config::getAppPort());
    setupRoutes();
}

void HttpServer::setupRoutes() {
    // --- Public Routes ---
    AuthRoutes::setupPublicRoutes(app, user_repo);

    // --- Authenticated Routes ---
    // Dataset Routes
    DatasetRoutes::setupRoutes(app, dataset_repo, dataset_manager, data_processor);

    // Visualization Routes
    VisualizationRoutes::setupRoutes(app, visualization_repo, dataset_repo, data_processor);

    // Health check endpoint
    CROW_ROUTE(app, "/health")
        .methods("GET"_method)
        ([](const crow::request& req) {
            return crow::response(200, JsonUtils::createSuccessResponse("Server is healthy").dump());
        });

    // Root endpoint
    CROW_ROUTE(app, "/")
        .methods("GET"_method)
        ([](const crow::request& req) {
            return crow::response(200, JsonUtils::createSuccessResponse("Welcome to DataVizSystem API!").dump());
        });

    Logger::info("All routes registered.");
}

void HttpServer::run() {
    Logger::info("HTTP server listening on port {}", Config::getAppPort());
    // Start the Crow server
    // Crow uses `concurrency::spsc_queue` for message passing, making it thread-safe for requests.
    // It's recommended to run Crow with multiple threads for better performance.
    app.port(Config::getAppPort()).multithreaded().run();
}
```
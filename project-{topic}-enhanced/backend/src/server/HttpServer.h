```cpp
#ifndef DATAVIZ_HTTPSERVER_H
#define DATAVIZ_HTTPSERVER_H

#include <crow.h>
#include <string>
#include "../config/Config.h"
#include "../utils/Logger.h"
#include "../db/Database.h"
#include "../data/DatasetManager.h"
#include "../data/DataProcessor.h"
#include "middleware/AuthMiddleware.h"
#include "middleware/LoggingMiddleware.h"
#include "middleware/ErrorMiddleware.h"
#include "routes/AuthRoutes.h"
#include "routes/DatasetRoutes.h"
#include "routes/VisualizationRoutes.h"

// Custom context for Crow to pass common dependencies
struct CrowAppContext {
    // Database connection management (pqxx::connection_base is not copyable/movable, use shared_ptr or factory)
    // For Crow, it's better to pass repositories or factories to routes.
    std::shared_ptr<Database> db_conn;
    std::shared_ptr<AuthMiddleware> auth_middleware;
    std::shared_ptr<DatasetManager> dataset_manager;
    std::shared_ptr<DataProcessor> data_processor;

    CrowAppContext() = default; // Default constructor needed
};

class HttpServer {
private:
    crow::App<
        LoggingMiddleware,
        ErrorMiddleware,
        AuthMiddleware // Order matters: Logging -> Error -> Auth
    > app;

    // Repositories and Managers
    std::shared_ptr<Database> db;
    std::shared_ptr<UserRepository> user_repo;
    std::shared_ptr<DatasetRepository> dataset_repo;
    std::shared_ptr<VisualizationRepository> visualization_repo;
    std::shared_ptr<DatasetManager> dataset_manager;
    std::shared_ptr<DataProcessor> data_processor;

    // Middlewares
    std::shared_ptr<AuthMiddleware> auth_middleware;

    void setupRoutes();
    void setupMiddlewareDependencies();

public:
    HttpServer();
    void run();
};

#endif // DATAVIZ_HTTPSERVER_H
```
```cpp
#include <drogon/drogon.h>
#include "controllers/api/v1/AuthController.h"
#include "controllers/api/v1/UserController.h"
#include "controllers/api/v1/PostController.h"
#include "controllers/web/AdminController.h"
#include "filters/AuthFilter.h"
#include "filters/RateLimitFilter.h"
#include "middleware/ErrorHandler.h"
#include "utils/Cache.h"

#include <iostream>
#include <fstream>
#include <json/json.h> // For config parsing

// Function to load database credentials from environment variables or .env file
void loadDatabaseConfig(Json::Value& config) {
    // Priority: Environment variables > config.json default
    const char* dbHost = std::getenv("DB_HOST");
    const char* dbPort = std::getenv("DB_PORT");
    const char* dbUser = std::getenv("DB_USER");
    const char* dbPass = std::getenv("DB_PASSWORD");
    const char* dbName = std::getenv("DB_NAME");

    if (dbHost) config["db_client"][0]["host"] = dbHost;
    if (dbPort) config["db_client"][0]["port"] = std::atoi(dbPort);
    if (dbUser) config["db_client"][0]["user"] = dbUser;
    if (dbPass) config["db_client"][0]["password"] = dbPass;
    if (dbName) config["db_client"][0]["dbname"] = dbName;
}

int main() {
    std::cout << "Starting CMS_Drogon_Project..." << std::endl;

    // Set HTTP logger
    drogon::app().setLogPath("./logs");
    drogon::app().setLogLevel(trantor::Logger::INFO);

    // Load configuration from config.json
    Json::Value appConfig;
    std::ifstream config_file("config.json");
    if (config_file.is_open()) {
        config_file >> appConfig;
        config_file.close();
        drogon::app().loadJsonConfig(appConfig);
        std::cout << "Configuration loaded from config.json." << std::endl;
    } else {
        std::cerr << "Warning: config.json not found. Using default Drogon settings." << std::endl;
    }

    // Override DB config with environment variables if present
    loadDatabaseConfig(appConfig);
    if (!appConfig["db_client"].empty()) {
        drogon::app().loadJsonConfig(appConfig); // Reload config with updated DB settings
        std::cout << "Database configuration updated from environment variables." << std::endl;
    }


    // Set the path for views (templates)
    drogon::app().setViewPath("views");

    // Enable session support
    drogon::app().enableSession();

    // Register filters globally or to specific paths
    drogon::app().registerFilter("AuthFilter"); // Example: applies to paths tagged with "AuthFilter"
    drogon::app().registerFilter("RateLimitFilter"); // Example: applies to paths tagged with "RateLimitFilter"

    // Register custom error handler
    drogon::app().registerHandler(
        "/",
        [](const drogon::HttpRequestPtr &req,
           std::function<void(const drogon::HttpResponsePtr &)> &&callback) {
            drogon::app().getCustomErrorHandler()
                ? drogon::app().getCustomErrorHandler()(req, callback)
                : drogon::app().getDefaultErrorHandler()(req, callback);
        },
        {drogon::Get, drogon::Post, drogon::Put, drogon::Delete} // Apply to all methods
    );
    // Note: A more direct way to set custom error handler is app().setCustomErrorHandler, but this shows a generic handler registration.

    // Register custom not found handler
    drogon::app().setCustom404Page([]() {
        auto resp = drogon::HttpResponse::newHttpResponse();
        resp->setStatusCode(drogon::k404NotFound);
        resp->setContentTypeCode(drogon::CT_TEXT_HTML);
        resp->setBody("<h1>404 Not Found</h1><p>The requested resource was not found on this server.</p>");
        return resp;
    });

    // Initialize in-memory cache
    CMS::Utils::Cache::init(60 * 10); // Cache items expire after 10 minutes

    std::cout << "CMS application initialized. Starting server on port "
              << drogon::app().get=drogon::app().getHttpPort() << std::endl;
    drogon::app().run();

    std::cout << "CMS_Drogon_Project stopped." << std::endl;
    return 0;
}
```
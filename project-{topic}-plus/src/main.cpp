```cpp
#include "server/Server.h"
#include "config/AppConfig.h"
#include "database/Database.h"
#include "utils/Logger.h"
#include "cache/Cache.h"

int main() {
    // 1. Initialize Logger first
    TaskManager::Config::AppConfig& config = TaskManager::Config::AppConfig::getInstance();
    config.load(); // Load config from .env
    
    std::string log_level = config.get("LOG_LEVEL", "info");
    TaskManager::Utils::Logger::init(log_level);
    auto logger = TaskManager::Utils::Logger::getLogger();

    logger->info("Application started. Loading configurations...");

    // 2. Get database and cache instances
    TaskManager::Database::Database& db = TaskManager::Database::Database::getInstance();
    TaskManager::Cache::Cache& cache = TaskManager::Cache::Cache::getInstance();

    // 3. Create and run the API server
    try {
        TaskManager::Server::ApiServer api_server(config, db, cache);
        api_server.run();
    } catch (const std::exception& e) {
        logger->critical("An unhandled exception occurred during server operation: {}", e.what());
        return 1;
    } catch (...) {
        logger->critical("An unknown unhandled exception occurred during server operation.");
        return 1;
    }

    logger->info("Application stopped gracefully.");
    return 0;
}
```
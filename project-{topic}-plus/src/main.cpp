#include "app.h"
#include "config/config.h"
#include "database/MigrationManager.h"
#include "utils/Logger.h"

#include <iostream>
#include <stdexcept>

int main(int argc, char* argv[]) {
    // Initialize logger first
    Logger::init();
    LOG_INFO("Application starting up...");

    // Load configuration
    try {
        Config::load("config.json");
        LOG_INFO("Configuration loaded successfully.");
    } catch (const std::exception& e) {
        LOG_CRITICAL("Failed to load configuration: {}", e.what());
        return 1; // Exit if config cannot be loaded
    }

    // Run database migrations
    try {
        MigrationManager::runMigrations(Config::getDbPath());
        LOG_INFO("Database migrations completed successfully.");
    } catch (const std::exception& e) {
        LOG_CRITICAL("Database migration failed: {}", e.what());
        return 1; // Exit if migrations fail
    }

    // Initialize and run the Crow application
    App app;
    try {
        int port = Config::getApiPort();
        LOG_INFO("Starting API server on port {}", port);
        app.run(port);
    } catch (const std::exception& e) {
        LOG_CRITICAL("Application runtime error: {}", e.what());
        return 1;
    }

    LOG_INFO("Application shut down.");
    return 0;
}
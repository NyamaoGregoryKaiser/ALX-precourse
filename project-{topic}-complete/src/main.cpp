```cpp
#include <iostream>
#include <string>
#include <cstdlib> // For getenv
#include <csignal> // For signal handling

#include "common/Logger.hpp"
#include "common/Exceptions.hpp"
#include "config/Config.hpp"
#include "database/DBManager.hpp"
#include "api/APIServer.hpp"

// Global pointer to the API server to allow signal handling
std::unique_ptr<MLToolkit::API::APIServer> g_api_server;

// Signal handler for graceful shutdown
void signal_handler(int signal) {
    if (signal == SIGINT || signal == SIGTERM) {
        LOG_WARN("Shutdown signal ({}) received. Shutting down server...", signal);
        if (g_api_server) {
            g_api_server->stop();
        }
        MLToolkit::Database::DBManager::get_instance().disconnect();
        exit(0);
    }
}

int main(int argc, char* argv[]) {
    // 1. Initialize Logger
    MLToolkit::Common::Logger::init("ml_toolkit.log", spdlog::level::info);
    LOG_INFO("ML-Toolkit Server starting...");

    // 2. Load Configuration
    try {
        MLToolkit::Config::Config::get_instance().load("config/default.conf");
        // Adjust log level if specified in config or env
        std::string log_level_str = MLToolkit::Config::Config::get_instance().get_string("LOG_LEVEL", "info");
        spdlog::level::level_enum log_level;
        if (log_level_str == "trace") log_level = spdlog::level::trace;
        else if (log_level_str == "debug") log_level = spdlog::level::debug;
        else if (log_level_str == "warn") log_level = spdlog::level::warn;
        else if (log_level_str == "error") log_level = spdlog::level::err;
        else if (log_level_str == "critical") log_level = spdlog::level::critical;
        else log_level = spdlog::level::info; // Default
        spdlog::set_level(log_level);
        LOG_INFO("Current effective log level: {}", spdlog::level::to_string_view(log_level));
    } catch (const MLToolkit::Common::Config::ConfigException& e) {
        LOG_CRITICAL("Configuration error: {}", e.what());
        return 1;
    }

    // 3. Connect to Database
    try {
        std::string db_host = MLToolkit::Config::Config::get_instance().get_string("DB_HOST", "localhost");
        int db_port = MLToolkit::Config::Config::get_instance().get_int("DB_PORT", 5432);
        std::string db_name = MLToolkit::Config::Config::get_instance().get_string("DB_NAME", "ml_toolkit_db");
        std::string db_user = MLToolkit::Config::Config::get_instance().get_string("DB_USER", "ml_user");
        std::string db_password = MLToolkit::Config::Config::get_instance().get_string("DB_PASSWORD", "ml_password");

        std::string conn_str = "host=" + db_host + " port=" + std::to_string(db_port) +
                               " dbname=" + db_name + " user=" + db_user + " password=" + db_password;
        
        MLToolkit::Database::DBManager::get_instance().connect(conn_str);
    } catch (const MLToolkit::Common::DatabaseException& e) {
        LOG_CRITICAL("Failed to connect to database: {}", e.what());
        return 1;
    }

    // 4. Set up signal handlers for graceful shutdown
    std::signal(SIGINT, signal_handler);
    std::signal(SIGTERM, signal_handler);

    // 5. Start API Server
    try {
        int api_port = MLToolkit::Config::Config::get_instance().get_int("API_PORT", 8080);
        g_api_server = std::make_unique<MLToolkit::API::APIServer>();
        g_api_server->run(api_port);
    } catch (const std::exception& e) {
        LOG_CRITICAL("API Server encountered a critical error: {}", e.what());
        MLToolkit::Database::DBManager::get_instance().disconnect();
        return 1;
    }

    LOG_INFO("ML-Toolkit Server gracefully stopped.");
    return 0;
}
```
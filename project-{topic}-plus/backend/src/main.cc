```cpp
#include <drogon/drogon.h>
#include <drogon/config.h>
#include <iostream>
#include "config/ConfigLoader.h"
#include "plugins/GlobalInitPlugin.h" // For any global initialization logic

int main() {
    // Load environment variables first
    // ConfigLoader::loadEnv(".env"); // Or rely on system env vars directly if running from Docker

    // Drogon will automatically load config.json from the build directory
    // or from a path specified by the DROGON_SERVER_CONFIG environment variable.

    // Get database connection string from environment variables for dynamic configuration
    std::string db_host = ConfigLoader::getEnv("DATABASE_HOST", "localhost");
    std::string db_port = ConfigLoader::getEnv("DATABASE_PORT", "5432");
    std::string db_user = ConfigLoader::getEnv("DATABASE_USER", "task_manager_user");
    std::string db_password = ConfigLoader::getEnv("DATABASE_PASSWORD", "");
    std::string db_name = ConfigLoader::getEnv("DATABASE_NAME", "task_manager_db");

    // Configure the database client programmatically or ensure config.json uses placeholders
    // This example assumes config.json uses placeholders like ${DATABASE_HOST}
    // and Drogon's config loader replaces them. If not, you might need to manipulate the Json::Value
    // of the config directly before app().run().

    // Set server port from environment variable
    std::string server_port_str = ConfigLoader::getEnv("SERVER_PORT", "8080");
    int server_port = std::stoi(server_port_str);

    // Drogon can automatically load environment variables for placeholders in config.json
    // However, it's good practice to ensure they are set.

    // Register controllers
    // Drogon automatically discovers controllers in the 'controllers' namespace
    // if configured via config.json or if they are linked.

    // Start Drogon application
    LOG_INFO << "Server starting on port " << server_port;
    drogon::app().addListener("0.0.0.0", server_port); // Listen on all interfaces
    drogon::app().run();

    return 0;
}
```
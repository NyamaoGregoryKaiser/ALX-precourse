```cpp
#include "server/HttpServer.h"
#include "config/Config.h"
#include "utils/Logger.h"

int main() {
    // 1. Load Configuration
    if (!Config::loadFromEnv()) {
        Logger::critical("Failed to load configuration from environment variables. Exiting.");
        return 1;
    }

    // 2. Initialize Logger based on config
    Logger::init(Config::getLogLevel());
    Logger::info("DataVizSystem starting...");
    Logger::info("Configuration loaded successfully.");

    // 3. Start HTTP Server
    try {
        HttpServer server;
        server.run(); // This call blocks until the server is stopped
    } catch (const std::exception& e) {
        Logger::critical("Server startup failed: {}", e.what());
        return 1;
    } catch (...) {
        Logger::critical("An unknown error occurred during server startup. Exiting.");
        return 1;
    }

    Logger::info("DataVizSystem stopped.");
    return 0;
}
```
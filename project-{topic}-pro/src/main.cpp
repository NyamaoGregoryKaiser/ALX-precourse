```cpp
#include "util/Config.hpp"
#include "util/Logger.hpp"
#include "database/DatabaseManager.hpp"
#include "server/HttpServer.hpp"
#include <iostream>
#include <signal.h> // For signal handling
#include <Pistache/Http.h>

// Global pointer for server shutdown on signal
std::unique_ptr<HttpServer> globalHttpServer;

void signalHandler(int signum) {
    Logger::get()->warn("Interrupt signal ({}) received. Shutting down server...", signum);
    if (globalHttpServer) {
        globalHttpServer->shutdown();
    }
    // Perform any other cleanup here
    DatabaseManager::close(); // If needed for global connection pools
    exit(signum);
}

int main(int argc, char* argv[]) {
    // 1. Load Configuration
    std::string configFilePath = (argc > 1) ? argv[1] : "config/default.json";
    try {
        Config::load(configFilePath);
    } catch (const std::exception& e) {
        std::cerr << "Failed to load configuration: " << e.what() << std::endl;
        return 1;
    }

    // 2. Initialize Logger
    try {
        Logger::init("PaymentProcessor", Config::getLogLevel(), Config::getLogFilePath());
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize logger: " << e.what() << std::endl;
        return 1;
    }
    Logger::get()->info("Starting Payment Processor Application...");

    // 3. Initialize Database
    try {
        DatabaseManager::init(Config::getDbHost(), Config::getDbPort(),
                              Config::getDbName(), Config::getDbUser(), Config::getDbPassword());
    } catch (const std::exception& e) {
        Logger::get()->critical("Failed to initialize database: {}", e.what());
        return 1;
    }

    // 4. Setup and Start HTTP Server
    try {
        Pistache::Port port(Config::getAppPort());
        Pistache::Address addr(Pistache::Ipv4::any(), port);

        globalHttpServer = std::make_unique<HttpServer>(addr);
        globalHttpServer->init(Config::get().value("/application/threads"_json_pointer, 2)); // Default to 2 threads

        // Register signal handlers for graceful shutdown
        signal(SIGINT, signalHandler);  // Ctrl+C
        signal(SIGTERM, signalHandler); // kill command

        globalHttpServer->start();
    } catch (const std::exception& e) {
        Logger::get()->critical("Failed to start HTTP server: {}", e.what());
        return 1;
    }

    Logger::get()->info("Payment Processor Application exiting.");
    return 0;
}
```
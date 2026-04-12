#pragma once

#include <string>
#include <memory> // For std::unique_ptr

#include "src/config/config.h"
#include "src/utils/logger.h"
#include "src/database/database_manager.h"
#include "src/server.h"

class Application {
public:
    Application();
    ~Application();

    // Initialize all application components
    void init();

    // Start the HTTP server
    void start_server();

    // Run database migrations
    void run_migrations();

    // Seed initial database data
    void run_seeders();

private:
    std::unique_ptr<HttpRestServer> api_server_;
};
```
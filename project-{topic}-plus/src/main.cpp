#include "src/app.h"
#include "src/utils/logger.h" // Include for direct logger access if needed in main

int main(int argc, char *argv[]) {
    // Initialize the application
    Application app;

    try {
        // Run database migrations
        app.run_migrations();

        // Seed initial data
        app.run_seeders();

        // Initialize the server and other components
        app.init();

        // Start the HTTP server
        app.start_server();

    } catch (const std::exception& e) {
        LOG_ERROR("Application failed to start: " + std::string(e.what()));
        return EXIT_FAILURE;
    } catch (...) {
        LOG_ERROR("An unknown error occurred during application startup.");
        return EXIT_FAILURE;
    }

    return EXIT_SUCCESS;
}
```
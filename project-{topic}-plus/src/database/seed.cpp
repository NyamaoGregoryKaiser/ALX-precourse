#include "src/app.h"
#include "src/utils/logger.h"

// This is a standalone executable to run only seeders.
// Useful for initial data population.
int main() {
    Application app; // Initializes logger and loads config

    try {
        // Ensure migrations are run before seeding
        app.run_migrations();
        app.run_seeders();
        LOG_INFO("Database seeding finished successfully.");
        return EXIT_SUCCESS;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to run database seeders: " + std::string(e.what()));
        return EXIT_FAILURE;
    } catch (...) {
        LOG_ERROR("An unknown error occurred during seeding.");
        return EXIT_FAILURE;
    }
}
```
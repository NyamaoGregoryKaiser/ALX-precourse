#include "src/app.h"
#include "src/utils/logger.h"

// This is a standalone executable to run only migrations.
// Useful for CI/CD or database management workflows.
int main() {
    Application app; // Initializes logger and loads config

    try {
        app.run_migrations();
        LOG_INFO("Database migrations finished successfully.");
        return EXIT_SUCCESS;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to run database migrations: " + std::string(e.what()));
        return EXIT_FAILURE;
    } catch (...) {
        LOG_ERROR("An unknown error occurred during migrations.");
        return EXIT_FAILURE;
    }
}
```
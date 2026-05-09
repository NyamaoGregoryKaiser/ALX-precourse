```cpp
#include "util/Logger.h"
#include "api/ApiServer.h"
#include "data/db/Database.h"
#include "data/db/migrations/MigrationManager.h"
#include "core/config/ConfigManager.h"

#include <iostream>
#include <memory>
#include <string>

// A simple mock for a GUI application, demonstrating how it would
// interact with the API or data processing logic directly.
// In a real scenario, this would be a full-fledged Qt/ImGui app.
void start_gui_application() {
    // This is highly conceptual. A real GUI would use a GUI framework (e.g., Qt).
    // It would instantiate GUI elements and connect signals/slots to business logic
    // or make API calls to the local/remote VisuFlowAPI server.
    VisuFlow::GUI::MainWindow mainWindow; // Conceptual main window
    // mainWindow.show(); // Show the main window (if using Qt)
    // Run GUI event loop (e.g., QApplication::exec() for Qt)
    VisuFlow::Util::Logger::log(spdlog::level::info, "GUI application started (conceptual).");

    // Example: GUI asks for data for a dashboard
    // This could either call local DataProcessor/DataSourceManager directly
    // or make an HTTP request to the ApiServer.
    // For this example, let's assume it calls the local API.
    std::string dashboardId = "dashboard_123";
    std::string token = "mock_jwt_token"; // Obtained from login

    // Conceptual API call from GUI
    // VisuFlow::API::Client apiClient("http://localhost:9080");
    // auto data = apiClient.fetchDashboardData(dashboardId, token);
    // mainWindow.renderDashboard(data); // Render data in GUI

    VisuFlow::Util::Logger::log(spdlog::level::info, "GUI requested dashboard data.");
}

int main(int argc, char* argv[]) {
    // 1. Initialize Configuration
    VisuFlow::Core::Config::ConfigManager::loadConfig("config.json");
    auto& config = VisuFlow::Core::Config::ConfigManager::getInstance();

    // 2. Initialize Logger
    VisuFlow::Util::Logger::init(config.getString("log_level", "info"), config.getString("log_file", "visuflow.log"));
    VisuFlow::Util::Logger::log(spdlog::level::info, "VisuFlow Analytics Platform starting...");

    // 3. Initialize Database
    try {
        VisuFlow::Data::DB::Database::init(
            config.getString("db_host", "localhost"),
            config.getString("db_port", "5432"),
            config.getString("db_name", "visuflow_db"),
            config.getString("db_user", "visuflow_user"),
            config.getString("db_password", "password")
        );
        VisuFlow::Util::Logger::log(spdlog::level::info, "Database connection established.");

        // 4. Run Migrations
        VisuFlow::Data::DB::MigrationManager migrator("scripts/db/migrations");
        migrator.runMigrations();
        VisuFlow::Util::Logger::log(spdlog::level::info, "Database migrations applied successfully.");
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::critical, "Database initialization failed: {}", e.what());
        return 1;
    }

    // 5. Start API Server in a separate thread/process
    unsigned int port = config.getUint("api_port", 9080);
    VisuFlow::API::ApiServer apiServer(port);
    try {
        apiServer.start();
        VisuFlow::Util::Logger::log(spdlog::level::info, "API Server listening on port {}.", port);

        // Optionally, start a conceptual GUI application (e.g., for desktop mode)
        // start_gui_application(); // Uncomment to run conceptual GUI

        // Keep main thread alive for API server
        // In a real Pistache/Boost.Beast server, there might be an explicit wait call.
        // For simplicity here, we'll just log and let it run (as it's often daemonized).
        // Or for a blocking server, you'd have a server.serve() or similar.
        // For Pistache, this would typically involve an `httpEndpoint->serveThreaded();`
        // or `httpEndpoint->serve();` and then waiting.
        std::cout << "Press Enter to stop the server..." << std::endl;
        std::cin.ignore(); // Block indefinitely until user input
        apiServer.stop();
        VisuFlow::Util::Logger::log(spdlog::level::info, "API Server stopped.");

    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::critical, "API Server failed to start: {}", e.what());
        return 1;
    }

    VisuFlow::Util::Logger::log(spdlog::level::info, "VisuFlow Analytics Platform shutting down.");
    return 0;
}
```
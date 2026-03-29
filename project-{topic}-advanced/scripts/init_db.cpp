```cpp
#include "../database/SQLiteDatabaseManager.hpp"
#include "../utils/Logger.hpp"
#include "../config/AppConfig.hpp"
#include <iostream>
#include <string>
#include <vector>
#include <filesystem> // C++17 for directory iteration

namespace fs = std::filesystem;

int main(int argc, char* argv[]) {
    AppConfig::loadConfig(".env");
    Logger::init(LogLevel::INFO, "db_init.log");

    std::string db_path = AppConfig::get("DATABASE_PATH", "db/alx_project_management.db");
    
    // Ensure the database directory exists
    fs::path db_dir = fs::path(db_path).parent_path();
    if (!db_dir.empty() && !fs::exists(db_dir)) {
        try {
            fs::create_directories(db_dir);
            Logger::log(LogLevel::INFO, "Created database directory: " + db_dir.string());
        } catch (const fs::filesystem_error& e) {
            Logger::log(LogLevel::CRITICAL, "Failed to create database directory " + db_dir.string() + ": " + e.what());
            return 1;
        }
    }

    try {
        SQLiteDatabaseManager db_manager(db_path);
        Logger::log(LogLevel::INFO, "Database connection established for initialization.");

        // Step 1: Initialize schema (run initial migration)
        db_manager.initializeSchema();
        
        // In a more complex migration system, you'd iterate through migration files in order
        // and apply any new ones, tracking versions in a separate table.
        // For this example, `initializeSchema` essentially runs V1 and checks/runs V2.

        // Step 2: Seed data
        std::string seed_script_path = "db/seed/seed_data.sql";
        if (fs::exists(seed_script_path)) {
            Logger::log(LogLevel::INFO, "Running seed data script: " + seed_script_path);
            db_manager.runSeedScript(seed_script_path);
        } else {
            Logger::log(LogLevel::WARNING, "Seed data script not found: " + seed_script_path);
        }

        Logger::log(LogLevel::INFO, "Database initialization and seeding complete.");

    } catch (const CustomException& e) {
        Logger::log(LogLevel::CRITICAL, "Database initialization failed: " + std::string(e.what()) + " Details: " + e.getDetails());
        return 1;
    } catch (const std::exception& e) {
        Logger::log(LogLevel::CRITICAL, "An unexpected error occurred during database initialization: " + std::string(e.what()));
        return 1;
    }
    Logger::close();
    return 0;
}

```
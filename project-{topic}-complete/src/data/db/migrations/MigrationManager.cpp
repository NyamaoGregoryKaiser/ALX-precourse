```cpp
#include "MigrationManager.h"

namespace VisuFlow {
namespace Data {
namespace DB {

MigrationManager::MigrationManager(const std::string& migrationScriptsPath)
    : m_migrationScriptsPath(migrationScriptsPath) {
    VisuFlow::Util::Logger::log(spdlog::level::info, "MigrationManager initialized. Scripts path: {}", m_migrationScriptsPath);
}

void MigrationManager::runMigrations() {
    VisuFlow::Util::Logger::log(spdlog::level::info, "Running database migrations...");
    createMigrationsTable();

    std::vector<std::string> appliedMigrations = getAppliedMigrations();
    std::vector<std::string> availableScripts;

    // Collect all .sql files from the migration directory
    for (const auto& entry : fs::directory_iterator(m_migrationScriptsPath)) {
        if (entry.is_regular_file() && entry.path().extension() == ".sql") {
            availableScripts.push_back(entry.path().filename().string());
        }
    }
    // Sort scripts to ensure they are applied in correct lexical/numerical order
    std::sort(availableScripts.begin(), availableScripts.end());

    int migrationsAppliedCount = 0;
    for (const std::string& scriptName : availableScripts) {
        // Check if migration has already been applied
        if (std::find(appliedMigrations.begin(), appliedMigrations.end(), scriptName) == appliedMigrations.end()) {
            VisuFlow::Util::Logger::log(spdlog::level::info, "Applying migration: {}", scriptName);
            std::string scriptPath = m_migrationScriptsPath + "/" + scriptName;
            std::ifstream file(scriptPath);
            if (!file.is_open()) {
                VisuFlow::Util::Logger::log(spdlog::level::critical, "Failed to open migration script: {}", scriptPath);
                throw std::runtime_error("Failed to open migration script: " + scriptPath);
            }

            std::string sql((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
            file.close();

            try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
                pqxx::work txn(*conn);
                txn.exec(sql);
                txn.commit();
                markMigrationAsApplied(scriptName);
                VisuFlow::Util::Logger::log(spdlog::level::info, "Migration {} applied successfully.", scriptName);
                migrationsAppliedCount++;
            } catch (const pqxx::sql_error& e) {
                VisuFlow::Util::Logger::log(spdlog::level::critical, "Failed to apply migration {}: SQL error: {}", scriptName, e.what());
                throw std::runtime_error("Migration failed: " + scriptName + " - " + e.what());
            } catch (const std::exception& e) {
                VisuFlow::Util::Logger::log(spdlog::level::critical, "Failed to apply migration {}: Error: {}", scriptName, e.what());
                throw std::runtime_error("Migration failed: " + scriptName + " - " + e.what());
            }
        } else {
            VisuFlow::Util::Logger::log(spdlog::level::debug, "Migration {} already applied. Skipping.", scriptName);
        }
    }
    VisuFlow::Util::Logger::log(spdlog::level::info, "Database migrations finished. {} new migrations applied.", migrationsAppliedCount);
}

void MigrationManager::createMigrationsTable() {
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        txn.exec(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            "   id SERIAL PRIMARY KEY,"
            "   migration_name VARCHAR(255) UNIQUE NOT NULL,"
            "   applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            ");"
        );
        txn.commit();
        VisuFlow::Util::Logger::log(spdlog::level::debug, "Schema migrations table ensured.");
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::critical, "Failed to create schema_migrations table: {}", e.what());
        throw std::runtime_error("Failed to setup migration tracking: " + std::string(e.what()));
    }
}

std::vector<std::string> MigrationManager::getAppliedMigrations() {
    std::vector<std::string> applied;
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        pqxx::result r = txn.exec("SELECT migration_name FROM schema_migrations ORDER BY migration_name");
        for (const auto& row : r) {
            applied.push_back(row[0].as<std::string>());
        }
        txn.commit();
    } catch (const pqxx::sql_error& e) {
        // If table doesn't exist, it means no migrations have been applied yet.
        // This is fine for the first run.
        if (std::string(e.sqlstate()) != "42P01") { // 42P01 is "undefined_table"
            VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error getting applied migrations: {}", e.what());
            throw std::runtime_error("Failed to retrieve applied migrations: " + std::string(e.what()));
        }
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error getting applied migrations: {}", e.what());
        throw std::runtime_error("Failed to retrieve applied migrations: " + std::string(e.what()));
    }
    return applied;
}

void MigrationManager::markMigrationAsApplied(const std::string& filename) {
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        txn.exec_params(
            "INSERT INTO schema_migrations (migration_name) VALUES ($1)",
            filename
        );
        txn.commit();
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::critical, "Failed to mark migration {} as applied: {}", filename, e.what());
        throw std::runtime_error("Failed to mark migration as applied: " + filename + " - " + e.what());
    }
}

} // namespace DB
} // namespace Data
} // namespace VisuFlow
```
```cpp
#ifndef VISUFLOW_MIGRATION_MANAGER_H
#define VISUFLOW_MIGRATION_MANAGER_H

#include "data/db/Database.h"
#include "util/Logger.h"

#include <string>
#include <vector>
#include <fstream>
#include <algorithm>
#include <filesystem> // C++17 filesystem for listing files

namespace VisuFlow {
namespace Data {
namespace DB {

namespace fs = std::filesystem;

/**
 * @brief Manages database schema migrations.
 * Scans a directory for SQL migration files and applies them in order.
 */
class MigrationManager {
public:
    explicit MigrationManager(const std::string& migrationScriptsPath);

    /**
     * @brief Runs all pending database migrations.
     * Ensures migrations are applied exactly once and in correct order.
     * @throws std::runtime_error if migrations fail.
     */
    void runMigrations();

private:
    std::string m_migrationScriptsPath;

    /**
     * @brief Creates a table to track applied migrations in the database.
     */
    void createMigrationsTable();

    /**
     * @brief Gets a list of already applied migrations from the database.
     * @return A vector of migration filenames.
     */
    std::vector<std::string> getAppliedMigrations();

    /**
     * @brief Marks a migration as applied in the database.
     * @param filename The filename of the applied migration.
     */
    void markMigrationAsApplied(const std::string& filename);
};

} // namespace DB
} // namespace Data
} // namespace VisuFlow

#endif // VISUFLOW_MIGRATION_MANAGER_H
```
#pragma once

#include <string>
#include <vector>
#include <algorithm> // For std::sort

class MigrationManager {
public:
    explicit MigrationManager(const std::string& migration_dir);
    void runMigrations();

private:
    std::string migration_dir_;

    // Helper to get already applied migrations from the database
    std::vector<std::string> getAppliedMigrations();
    // Helper to apply a single migration file
    void applyMigration(const std::string& version, const std::string& script_content);
};
```
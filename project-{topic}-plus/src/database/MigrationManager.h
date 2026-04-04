#pragma once

#include <string>
#include <vector>
#include <map>
#include <functional>
#include <memory>
#include "SQLiteManager.h"

namespace tm_api {
namespace database {

struct Migration {
    int version;
    std::string name;
    std::string sql;
};

class MigrationManager {
public:
    static void runMigrations(const std::string& dbPath);

private:
    // Store migrations in a map, keyed by version, for ordered execution
    static std::map<int, Migration> migrations;
    static void initializeMigrations();
    static int getCurrentDbVersion(std::shared_ptr<SQLiteManager> dbManager);
    static void createMigrationsTable(std::shared_ptr<SQLiteManager> dbManager);
    static void applyMigration(std::shared_ptr<SQLiteManager> dbManager, const Migration& migration);
};

} // namespace database
} // namespace tm_api
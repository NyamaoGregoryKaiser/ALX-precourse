#include "MigrationManager.h"
#include "utils/Logger.h"
#include <algorithm>
#include <sstream>

namespace tm_api {
namespace database {

std::map<int, Migration> MigrationManager::migrations;

void MigrationManager::initializeMigrations() {
    // V1: Initial schema for users and tasks
    migrations[1] = {
        1, "create_initial_schema",
        R"(
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY NOT NULL,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'TODO',
            priority TEXT NOT NULL DEFAULT 'Medium',
            due_date TEXT,
            assigned_to TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        );
        )"
    };
    // Future migrations would go here:
    // migrations[2] = {2, "add_index_to_tasks", "CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);"};
    // migrations[3] = {3, "add_comments_table", "CREATE TABLE IF NOT EXISTS comments (...) ;"};
}

void MigrationManager::runMigrations(const std::string& dbPath) {
    initializeMigrations();
    auto dbManager = std::make_shared<SQLiteManager>(dbPath);
    createMigrationsTable(dbManager); // Ensure migrations table exists

    int currentVersion = getCurrentDbVersion(dbManager);
    LOG_INFO("Current database version: {}", currentVersion);

    for (const auto& pair : migrations) {
        const Migration& migration = pair.second;
        if (migration.version > currentVersion) {
            LOG_INFO("Applying migration V{}: {}", migration.version, migration.name);
            applyMigration(dbManager, migration);
            currentVersion = migration.version;
            LOG_INFO("Successfully applied migration V{}.", migration.version);
        }
    }
    LOG_INFO("All migrations applied. Database is up to date (version {}).", currentVersion);

    // Seed data after migrations
    std::string seedSql = R"(
        INSERT OR IGNORE INTO users (id, username, email, password_hash, role) VALUES
        ('admin-uuid', 'admin', 'admin@example.com', 'admin_hash', 'admin'),
        ('user1-uuid', 'john_doe', 'john.doe@example.com', 'user1_hash', 'user');

        INSERT OR IGNORE INTO tasks (id, title, description, created_by, assigned_to, status, priority) VALUES
        ('task1-uuid', 'Setup project structure', 'Define directories, CMakeLists, etc.', 'admin-uuid', 'admin-uuid', 'IN_PROGRESS', 'High'),
        ('task2-uuid', 'Implement Auth API', 'Register, Login, JWT generation', 'admin-uuid', 'user1-uuid', 'TODO', 'High'),
        ('task3-uuid', 'Write unit tests', 'Ensure core utilities are tested', 'user1-uuid', 'admin-uuid', 'TODO', 'Medium');
    )";
    LOG_INFO("Seeding initial data...");
    SQLiteResult seedResult = dbManager->execute(seedSql);
    if (!seedResult.success) {
        LOG_ERROR("Failed to seed data: {}", seedResult.message);
        throw std::runtime_error("Failed to seed data: " + seedResult.message);
    }
    LOG_INFO("Seed data applied successfully.");
}

void MigrationManager::createMigrationsTable(std::shared_ptr<SQLiteManager> dbManager) {
    std::string createTableSql = R"(
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    )";
    SQLiteResult result = dbManager->execute(createTableSql);
    if (!result.success) {
        LOG_CRITICAL("Failed to create schema_migrations table: {}", result.message);
        throw std::runtime_error("Failed to create schema_migrations table: " + result.message);
    }
    LOG_DEBUG("schema_migrations table ensured.");
}

int MigrationManager::getCurrentDbVersion(std::shared_ptr<SQLiteManager> dbManager) {
    std::string sql = "SELECT MAX(version) FROM schema_migrations;";
    SQLiteResult result = dbManager->query(sql);

    if (!result.success) {
        LOG_ERROR("Failed to get current DB version: {}", result.message);
        // If the table doesn't exist, it implicitly means version 0.
        // Or if it fails for other reasons, we assume version 0 and let it fail on table creation.
        return 0;
    }

    if (result.rows.empty() || result.rows[0].empty() || result.rows[0][0] == "NULL") {
        return 0; // No migrations applied yet
    }
    return std::stoi(result.rows[0][0]);
}

void MigrationManager::applyMigration(std::shared_ptr<SQLiteManager> dbManager, const Migration& migration) {
    SQLiteResult result = dbManager->execute(migration.sql);
    if (!result.success) {
        LOG_CRITICAL("Failed to apply migration V{} '{}': {}", migration.version, migration.name, result.message);
        throw std::runtime_error("Migration failed: " + migration.name + " - " + result.message);
    }

    std::string insertMigrationSql = "INSERT INTO schema_migrations (version, name) VALUES (?, ?);";
    SQLiteResult insertResult = dbManager->prepareExecute(insertMigrationSql, {std::to_string(migration.version), migration.name});
    if (!insertResult.success) {
        LOG_CRITICAL("Failed to record migration V{} '{}' in schema_migrations table: {}", migration.version, migration.name, insertResult.message);
        throw std::runtime_error("Failed to record migration: " + migration.name + " - " + insertResult.message);
    }
}

} // namespace database
} // namespace tm_api
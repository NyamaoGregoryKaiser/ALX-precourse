#include "MigrationManager.h"
#include "../DbConnection.h"
#include "../../utils/Logger.h"

#include <filesystem>
#include <fstream>
#include <regex>

namespace fs = std::filesystem;

MigrationManager::MigrationManager(const std::string& migration_dir)
    : migration_dir_(migration_dir) {}

void MigrationManager::runMigrations() {
    LOG_INFO("Starting database migrations from: {}", migration_dir_);

    // 1. Ensure migrations table exists
    try {
        auto conn_wrapper = DbConnection::getPool().getConnection();
        pqxx::work txn(conn_wrapper->get());
        txn.exec(
            "CREATE TABLE IF NOT EXISTS db_migrations ("
            "id SERIAL PRIMARY KEY,"
            "version VARCHAR(255) UNIQUE NOT NULL,"
            "applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
            ");"
        );
        txn.commit();
        LOG_DEBUG("Ensured 'db_migrations' table exists.");
    } catch (const pqxx::sql_error& e) {
        LOG_ERROR("SQL Error ensuring migrations table: {}", e.what());
        throw DbException("Migration setup failed: " + std::string(e.what()));
    } catch (const std::exception& e) {
        LOG_ERROR("Error ensuring migrations table: {}", e.what());
        throw DbException("Migration setup failed: " + std::string(e.what()));
    }

    // 2. Get already applied migrations
    std::vector<std::string> applied_versions = getAppliedMigrations();
    std::set<std::string> applied_set(applied_versions.begin(), applied_versions.end());

    // 3. Find and sort migration files
    std::vector<std::pair<std::string, fs::path>> migration_files; // {version, path}
    std::regex migration_filename_regex(R"(V(\d+)__.*\.sql)");

    if (!fs::exists(migration_dir_) || !fs::is_directory(migration_dir_)) {
        LOG_ERROR("Migration directory does not exist or is not a directory: {}", migration_dir_);
        throw DbException("Invalid migration directory.");
    }

    for (const auto& entry : fs::directory_iterator(migration_dir_)) {
        if (entry.is_regular_file() && entry.path().extension() == ".sql") {
            std::string filename = entry.path().filename().string();
            std::smatch match;
            if (std::regex_match(filename, match, migration_filename_regex)) {
                migration_files.push_back({match[1].str(), entry.path()});
            } else {
                LOG_WARN("Skipping non-standard migration file: {}", filename);
            }
        }
    }

    // Sort by version number
    std::sort(migration_files.begin(), migration_files.end(),
              [](const auto& a, const auto& b) {
                  return std::stoi(a.first) < std::stoi(b.first);
              });

    // 4. Apply new migrations
    for (const auto& mig_pair : migration_files) {
        const std::string& version = mig_pair.first;
        const fs::path& path = mig_pair.second;

        if (applied_set.find(version) == applied_set.end()) {
            LOG_INFO("Applying migration: V{} - {}", version, path.filename().string());
            std::ifstream file(path);
            if (!file.is_open()) {
                LOG_ERROR("Failed to open migration file: {}", path.string());
                throw DbException("Failed to open migration file: " + path.string());
            }
            std::string script_content((std::istreambuf_iterator<char>(file)),
                                        std::istreambuf_iterator<char>());
            applyMigration(version, script_content);
            LOG_INFO("Migration V{} applied successfully.", version);
        } else {
            LOG_DEBUG("Migration V{} already applied, skipping.", version);
        }
    }

    LOG_INFO("All database migrations processed.");
}

std::vector<std::string> MigrationManager::getAppliedMigrations() {
    std::vector<std::string> applied_versions;
    try {
        auto conn_wrapper = DbConnection::getPool().getConnection();
        pqxx::nontransaction w(conn_wrapper->get()); // Use nontransaction for read
        pqxx::result r = w.exec("SELECT version FROM db_migrations ORDER BY version;");
        for (const auto& row : r) {
            applied_versions.push_back(row[0].as<std::string>());
        }
        LOG_DEBUG("Fetched {} applied migrations.", applied_versions.size());
    } catch (const pqxx::sql_error& e) {
        LOG_WARN("Could not query db_migrations table (might not exist yet): {}", e.what());
        // This is expected on first run, don't re-throw, just return empty.
    } catch (const std::exception& e) {
        LOG_ERROR("Error getting applied migrations: {}", e.what());
        throw DbException("Failed to retrieve applied migrations: " + std::string(e.what()));
    }
    return applied_versions;
}

void MigrationManager::applyMigration(const std::string& version, const std::string& script_content) {
    auto conn_wrapper = DbConnection::getPool().getConnection();
    pqxx::work txn(conn_wrapper->get());
    try {
        // Execute the migration script
        txn.exec(script_content);
        // Record the migration
        txn.exec_params("INSERT INTO db_migrations (version) VALUES ($1);", version);
        txn.commit();
    } catch (const pqxx::sql_error& e) {
        txn.abort();
        LOG_ERROR("SQL Error applying migration V{}: {} - Query: {}", version, e.what(), e.query());
        throw DbException("Failed to apply migration V" + version + ": " + std::string(e.what()));
    } catch (const std::exception& e) {
        txn.abort();
        LOG_ERROR("Error applying migration V{}: {}", version, e.what());
        throw DbException("Failed to apply migration V" + version + ": " + std::string(e.what()));
    }
}
```
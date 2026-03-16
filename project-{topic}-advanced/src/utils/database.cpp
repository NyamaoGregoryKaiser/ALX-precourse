```cpp
#include "database.h"
#include <iostream>
#include <stdexcept>
#include <chrono>
#include <ctime>
#include <iomanip> // For std::put_time

namespace mobile_backend {
namespace utils {

// Static instance for singleton
Database& Database::get_instance() {
    static Database instance;
    return instance;
}

Database::Database() : db_handle(nullptr) {
    // Constructor does not open the database, initialize() does.
}

Database::~Database() {
    std::lock_guard<std::mutex> lock(db_mutex);
    if (db_handle) {
        LOG_INFO("Closing SQLite database.");
        sqlite3_close(db_handle);
        db_handle = nullptr;
    }
}

bool Database::initialize(const std::string& db_path) {
    std::lock_guard<std::mutex> lock(db_mutex); // Lock during initialization
    if (db_handle) {
        LOG_WARN("Database already initialized.");
        return true;
    }

    int rc = sqlite3_open(db_path.c_str(), &db_handle);
    if (rc != SQLITE_OK) {
        LOG_CRITICAL("Cannot open database: {}. Error: {}", db_path, sqlite3_errmsg(db_handle));
        db_handle = nullptr; // Ensure handle is null on failure
        return false;
    }

    LOG_INFO("SQLite database opened successfully: {}", db_path);

    // Enable WAL mode for better concurrency (though SQLite is still single-writer)
    // and PRAGMA foreign_keys for referential integrity
    execute_query("PRAGMA journal_mode = WAL;");
    execute_query("PRAGMA foreign_keys = ON;");

    if (!create_tables()) {
        LOG_CRITICAL("Failed to create database tables.");
        sqlite3_close(db_handle);
        db_handle = nullptr;
        return false;
    }

    LOG_INFO("Database tables ensured.");
    return true;
}

bool Database::create_tables() {
    std::string create_users_sql = R"(
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    )";

    std::string create_tasks_sql = R"(
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            completed BOOLEAN DEFAULT FALSE,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    )";

    // Add indexes for performance
    std::string create_user_idx_sql = "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);";
    std::string create_task_user_idx_sql = "CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);";

    if (!execute_query(create_users_sql)) {
        LOG_ERROR("Failed to create users table.");
        return false;
    }
    if (!execute_query(create_tasks_sql)) {
        LOG_ERROR("Failed to create tasks table.");
        return false;
    }
    if (!execute_query(create_user_idx_sql)) {
        LOG_ERROR("Failed to create users username index.");
        return false;
    }
    if (!execute_query(create_task_user_idx_sql)) {
        LOG_ERROR("Failed to create tasks user_id index.");
        return false;
    }

    return true;
}

bool Database::prepare_and_bind(sqlite3_stmt*& stmt, const std::string& sql, const std::vector<std::string>& params) {
    int rc = sqlite3_prepare_v2(db_handle, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        LOG_ERROR("Failed to prepare statement '{}'. Error: {}", sql, sqlite3_errmsg(db_handle));
        return false;
    }

    for (size_t i = 0; i < params.size(); ++i) {
        rc = sqlite3_bind_text(stmt, i + 1, params[i].c_str(), -1, SQLITE_TRANSIENT);
        if (rc != SQLITE_OK) {
            LOG_ERROR("Failed to bind parameter {} for statement '{}'. Error: {}", i + 1, sql, sqlite3_errmsg(db_handle));
            sqlite3_finalize(stmt);
            stmt = nullptr;
            return false;
        }
    }
    return true;
}

bool Database::execute_query(const std::string& sql, const std::vector<std::string>& params) {
    std::lock_guard<std::mutex> lock(db_mutex);
    if (!db_handle) {
        LOG_ERROR("Database not initialized for query: {}", sql);
        return false;
    }

    sqlite3_stmt* stmt = nullptr;
    if (!prepare_and_bind(stmt, sql, params)) {
        return false;
    }

    int rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        LOG_ERROR("Execution failed for query '{}'. Error: {}", sql, sqlite3_errmsg(db_handle));
        sqlite3_finalize(stmt);
        return false;
    }

    sqlite3_finalize(stmt);
    return true;
}

std::vector<DbRow> Database::fetch_query(const std::string& sql, const std::vector<std::string>& params) {
    std::lock_guard<std::mutex> lock(db_mutex);
    std::vector<DbRow> results;
    if (!db_handle) {
        LOG_ERROR("Database not initialized for fetch query: {}", sql);
        return results;
    }

    sqlite3_stmt* stmt = nullptr;
    if (!prepare_and_bind(stmt, sql, params)) {
        return results;
    }

    while (sqlite3_step(stmt) == SQLITE_ROW) {
        DbRow row;
        int num_cols = sqlite3_column_count(stmt);
        for (int i = 0; i < num_cols; ++i) {
            const char* col_name = sqlite3_column_name(stmt, i);
            const char* col_text = reinterpret_cast<const char*>(sqlite3_column_text(stmt, i));
            row.columns.push_back({col_name, col_text ? col_text : ""});
        }
        results.push_back(std::move(row));
    }

    sqlite3_finalize(stmt);
    return results;
}

long long Database::get_last_insert_rowid() {
    std::lock_guard<std::mutex> lock(db_mutex);
    if (!db_handle) {
        LOG_ERROR("Database not initialized when trying to get last_insert_rowid.");
        return -1;
    }
    return sqlite3_last_insert_rowid(db_handle);
}

std::string Database::get_current_timestamp() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);

    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%Y-%m-%d %H:%M:%S");
    return ss.str();
}

} // namespace utils
} // namespace mobile_backend
```
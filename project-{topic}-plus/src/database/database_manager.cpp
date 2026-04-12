#include "database_manager.h"
#include <vector>
#include <stdexcept>
#include <cstring> // For strcmp

DatabaseManager::DatabaseManager() {}

DatabaseManager::~DatabaseManager() {
    close();
}

DatabaseManager& DatabaseManager::getInstance() {
    static DatabaseManager instance;
    return instance;
}

void DatabaseManager::init(const std::string& db_path) {
    std::lock_guard<std::mutex> lock(db_mutex_);
    db_path_ = db_path;
    int rc = sqlite3_open(db_path_.c_str(), &db_);
    if (rc != SQLITE_OK) {
        LOG_ERROR("Cannot open database: " + std::string(sqlite3_errmsg(db_)));
        sqlite3_close(db_);
        db_ = nullptr;
        throw DatabaseException("Failed to open database: " + std::string(sqlite3_errmsg(db_)));
    }
    LOG_INFO("Database opened successfully: " + db_path_);
    // Enable WAL mode for better concurrency and performance
    execute("PRAGMA journal_mode = WAL;");
    execute("PRAGMA foreign_keys = ON;");
}

void DatabaseManager::close() {
    std::lock_guard<std::mutex> lock(db_mutex_);
    if (db_) {
        int rc = sqlite3_close(db_);
        if (rc != SQLITE_OK) {
            LOG_ERROR("Error closing database: " + std::string(sqlite3_errmsg(db_)));
            // Even if there's an error, try to set db_ to nullptr to prevent double-close
        } else {
            LOG_INFO("Database closed successfully.");
        }
        db_ = nullptr;
    }
}

void DatabaseManager::execute(const std::string& sql) {
    std::lock_guard<std::mutex> lock(db_mutex_);
    char* zErrMsg = nullptr;
    int rc = sqlite3_exec(db_, sql.c_str(), nullptr, nullptr, &zErrMsg);
    if (rc != SQLITE_OK) {
        std::string error_msg = "SQL error: " + std::string(zErrMsg) + " SQL: " + sql;
        LOG_ERROR(error_msg);
        sqlite3_free(zErrMsg);
        throw DatabaseException(error_msg);
    }
    LOG_DEBUG("SQL executed: " + sql);
}

// Callback function for sqlite3_exec
int DatabaseManager::callback(void* data, int argc, char** argv, char** azColName) {
    auto* rows = static_cast<std::vector<DbRow>*>(data);
    DbRow current_row;
    for (int i = 0; i < argc; i++) {
        current_row.columns[azColName[i]] = (argv[i] ? argv[i] : "NULL");
    }
    rows->push_back(current_row);
    return 0; // Return 0 to continue processing rows
}

std::vector<DbRow> DatabaseManager::query(const std::string& sql) {
    std::lock_guard<std::mutex> lock(db_mutex_);
    std::vector<DbRow> rows;
    char* zErrMsg = nullptr;
    int rc = sqlite3_exec(db_, sql.c_str(), callback, &rows, &zErrMsg);
    if (rc != SQLITE_OK) {
        std::string error_msg = "SQL error: " + std::string(zErrMsg) + " SQL: " + sql;
        LOG_ERROR(error_msg);
        sqlite3_free(zErrMsg);
        throw DatabaseException(error_msg);
    }
    LOG_DEBUG("SQL queried: " + sql + " returned " + std::to_string(rows.size()) + " rows.");
    return rows;
}

void DatabaseManager::bind_params(sqlite3_stmt* stmt, const std::vector<std::pair<int, std::string>>& params) {
    for (const auto& param : params) {
        int index = param.first;
        const std::string& value = param.second;
        // SQLite binds parameters by 1-based index or by name. We use 1-based index here.
        int rc = sqlite3_bind_text(stmt, index, value.c_str(), value.length(), SQLITE_TRANSIENT);
        if (rc != SQLITE_OK) {
            throw DatabaseException("Failed to bind parameter at index " + std::to_string(index) + ": " + std::string(sqlite3_errmsg(db_)));
        }
    }
}

std::vector<DbRow> DatabaseManager::execute_query_prepared(const std::string& sql,
                                                         const std::vector<std::pair<int, std::string>>& params) {
    std::lock_guard<std::mutex> lock(db_mutex_);
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        throw DatabaseException("Failed to prepare statement: " + std::string(sqlite3_errmsg(db_)));
    }

    try {
        bind_params(stmt, params);

        std::vector<DbRow> rows;
        while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
            DbRow current_row;
            for (int i = 0; i < sqlite3_column_count(stmt); ++i) {
                const char* col_name = sqlite3_column_name(stmt, i);
                const char* col_text = reinterpret_cast<const char*>(sqlite3_column_text(stmt, i));
                current_row.columns[col_name] = col_text ? col_text : "";
            }
            rows.push_back(current_row);
        }

        if (rc != SQLITE_DONE) {
            throw DatabaseException("Query failed: " + std::string(sqlite3_errmsg(db_)));
        }
        LOG_DEBUG("Prepared query executed: " + sql + " returned " + std::to_string(rows.size()) + " rows.");
        return rows;
    } catch (...) {
        sqlite3_finalize(stmt);
        throw;
    }
    sqlite3_finalize(stmt);
    return {}; // Should not reach here
}

int DatabaseManager::execute_non_query_prepared(const std::string& sql,
                                              const std::vector<std::pair<int, std::string>>& params) {
    std::lock_guard<std::mutex> lock(db_mutex_);
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        throw DatabaseException("Failed to prepare statement: " + std::string(sqlite3_errmsg(db_)));
    }

    try {
        bind_params(stmt, params);

        rc = sqlite3_step(stmt);
        if (rc != SQLITE_DONE) {
            throw DatabaseException("Non-query execution failed: " + std::string(sqlite3_errmsg(db_)));
        }
        int changes = sqlite3_changes(db_);
        LOG_DEBUG("Prepared non-query executed: " + sql + " affected " + std::to_string(changes) + " rows.");
        return changes;
    } catch (...) {
        sqlite3_finalize(stmt);
        throw;
    }
    sqlite3_finalize(stmt);
    return 0; // Should not reach here
}

long long DatabaseManager::last_insert_rowid() const {
    std::lock_guard<std::mutex> lock(db_mutex_); // Ensure this is also mutex protected
    if (db_) {
        return sqlite3_last_insert_rowid(db_);
    }
    return -1;
}
```
#pragma once

#include <string>
#include <vector>
#include <memory>
#include <sqlite3.h> // Direct SQLite C API for robust control
#include <mutex> // For thread-safe database access

#include "src/utils/logger.h"
#include "src/utils/exceptions.h"
#include "src/config/config.h"

// Forward declarations to avoid circular dependencies and for PIMPL if needed
class User;
class Task;

struct DbRow {
    std::unordered_map<std::string, std::string> columns; // column_name -> value_string
};

class DatabaseManager {
public:
    static DatabaseManager& getInstance();

    // Delete copy constructor and assignment operator
    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;

    // Initialize the database connection
    void init(const std::string& db_path);

    // Close the database connection
    void close();

    // Execute a non-query SQL statement (CREATE TABLE, INSERT, UPDATE, DELETE)
    void execute(const std::string& sql);

    // Execute a query SQL statement and return results
    std::vector<DbRow> query(const std::string& sql);

    // Execute a prepared statement for queries
    std::vector<DbRow> execute_query_prepared(const std::string& sql,
                                              const std::vector<std::pair<int, std::string>>& params);

    // Execute a prepared statement for non-queries (returns number of affected rows)
    int execute_non_query_prepared(const std::string& sql,
                                   const std::vector<std::pair<int, std::string>>& params);

    // Get the last inserted row ID
    long long last_insert_rowid() const;

private:
    DatabaseManager();
    ~DatabaseManager();

    sqlite3* db_ = nullptr; // SQLite database handle
    std::string db_path_;
    mutable std::mutex db_mutex_; // Mutex for thread-safe database access

    // Internal callback function for sqlite3_exec (for queries)
    static int callback(void* data, int argc, char** argv, char** azColName);

    // Internal helper for prepared statement binding
    void bind_params(sqlite3_stmt* stmt, const std::vector<std::pair<int, std::string>>& params);
};
```
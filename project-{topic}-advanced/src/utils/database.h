```cpp
#ifndef MOBILE_BACKEND_DATABASE_H
#define MOBILE_BACKEND_DATABASE_H

#include <string>
#include <memory>
#include <vector>
#include <mutex> // For protecting SQLite access
#include <sqlite3.h>
#include "logger.h"

namespace mobile_backend {
namespace utils {

// Structure to hold a single row of data from a query
struct DbRow {
    std::vector<std::pair<std::string, std::string>> columns; // name -> value
};

// Wrapper for SQLite3 database operations
class Database {
public:
    // Singleton pattern
    static Database& get_instance();
    // Delete copy constructor and assignment operator for singleton
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;
    Database(Database&&) = delete;
    Database& operator=(Database&&) = delete;

    ~Database();

    // Initializes the database connection and creates tables if they don't exist
    bool initialize(const std::string& db_path);

    // Executes a SQL query (e.g., INSERT, UPDATE, DELETE)
    // Returns true on success, false on failure.
    bool execute_query(const std::string& sql, const std::vector<std::string>& params = {});

    // Executes a SQL query that returns results (e.g., SELECT)
    // Returns a vector of DbRow on success, empty vector on failure.
    std::vector<DbRow> fetch_query(const std::string& sql, const std::vector<std::string>& params = {});

    // Helper to get current timestamp string
    static std::string get_current_timestamp();

    // Get the last inserted row ID
    long long get_last_insert_rowid();

private:
    Database(); // Private constructor for singleton

    sqlite3* db_handle;
    std::mutex db_mutex; // Mutex to protect SQLite operations

    // Internal helper for preparing and binding parameters
    bool prepare_and_bind(sqlite3_stmt*& stmt, const std::string& sql, const std::vector<std::string>& params);

    // Creates necessary tables
    bool create_tables();
};

} // namespace utils
} // namespace mobile_backend

#endif // MOBILE_BACKEND_DATABASE_H
```
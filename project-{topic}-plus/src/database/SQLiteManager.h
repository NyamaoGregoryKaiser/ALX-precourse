#pragma once

#include <sqlite3.h>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <functional>
#include <stdexcept>

namespace tm_api {
namespace database {

struct SQLiteResult {
    bool success;
    std::string message;
    std::vector<std::vector<std::string>> rows;
    std::vector<std::string> columnNames;
};

class SQLiteManager {
public:
    explicit SQLiteManager(const std::string& dbPath);
    ~SQLiteManager();

    // Prevent copy and move
    SQLiteManager(const SQLiteManager&) = delete;
    SQLiteManager& operator=(const SQLiteManager&) = delete;
    SQLiteManager(SQLiteManager&&) = delete;
    SQLiteManager& operator=(SQLiteManager&&) = delete;

    void open();
    void close();

    // Execute a non-query SQL statement (INSERT, UPDATE, DELETE, CREATE TABLE)
    SQLiteResult execute(const std::string& sql, const std::vector<std::string>& params = {});

    // Execute a query SQL statement (SELECT)
    SQLiteResult query(const std::string& sql, const std::vector<std::string>& params = {});

    // Wrapper for a prepared statement for safety and performance
    // Example usage:
    // dbManager->prepareExecute("INSERT INTO users (username, password) VALUES (?, ?)", {"testuser", "hashedpass"});
    SQLiteResult prepareExecute(const std::string& sql, const std::vector<std::string>& params = {});
    SQLiteResult prepareQuery(const std::string& sql, const std::vector<std::string>& params = {});

    // Get last inserted row ID
    long long lastInsertRowId() const;

private:
    std::string dbPath;
    sqlite3* db;
    std::mutex dbMutex; // Mutex for thread-safe database access

    static int callback(void* data, int argc, char** argv, char** azColName);
    SQLiteResult executeInternal(const std::string& sql, const std::function<void(sqlite3_stmt*)>& bindCallback = nullptr);
};

} // namespace database
} // namespace tm_api
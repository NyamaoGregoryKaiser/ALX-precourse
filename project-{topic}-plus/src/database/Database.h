```cpp
#ifndef DATABASE_H
#define DATABASE_H

#include <string>
#include <vector>
#include <map>
#include <sqlite3.h>
#include "../utils/Logger.h"
#include "../exceptions/CustomExceptions.h"

namespace TaskManager {
namespace Database {

using Row = std::map<std::string, std::string>;
using ResultSet = std::vector<Row>;

class Database {
public:
    static Database& getInstance();

    // Deleted copy constructor and assignment operator to prevent multiple instances
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    // Connect to the database
    void connect(const std::string& dbPath);

    // Disconnect from the database
    void disconnect();

    // Execute a non-query SQL statement (e.g., CREATE, INSERT, UPDATE, DELETE)
    void execute(const std::string& sql);

    // Execute a query SQL statement and return a ResultSet
    ResultSet query(const std::string& sql);

    // Execute a query SQL statement with parameters and return a ResultSet
    ResultSet preparedQuery(const std::string& sql, const std::vector<std::string>& params);

    // Execute a non-query SQL statement with parameters
    void preparedExecute(const std::string& sql, const std::vector<std::string>& params);

    // Get the ID of the last inserted row
    long long getLastInsertRowId();

    // Begin a transaction
    void beginTransaction();

    // Commit a transaction
    void commitTransaction();

    // Rollback a transaction
    void rollbackTransaction();

private:
    Database();
    ~Database();

    sqlite3* db_connection;
    std::string db_path;

    // Callback function for sqlite3_exec (used by query)
    static int callback(void* data, int argc, char** argv, char** azColName);

    // Helper for prepared statements
    void bindParams(sqlite3_stmt* stmt, const std::vector<std::string>& params);
};

} // namespace Database
} // namespace TaskManager

#endif // DATABASE_H
```
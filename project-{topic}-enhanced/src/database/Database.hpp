```cpp
#ifndef DATABASE_HPP
#define DATABASE_HPP

#include <sqlite3.h>
#include <string>
#include <stdexcept>
#include <memory>

// Custom exception for SQLite errors
class SQLiteException : public std::runtime_error {
public:
    explicit SQLiteException(const std::string& message) : std::runtime_error(message) {}
};

// Forward declaration for Statement class
class Statement;

// Wrapper class for SQLite database connection and operations.
class Database {
public:
    Database(const std::string& dbPath);
    ~Database();

    // Establishes a connection to the database.
    void connect();

    // Disconnects from the database.
    void disconnect();

    // Executes a non-query SQL statement (e.g., INSERT, UPDATE, DELETE, CREATE TABLE).
    // Throws SQLiteException on error.
    bool execute(const std::string& sql);

    // Prepares an SQL statement for execution, returning a Statement object.
    // Throws SQLiteException on error.
    Statement prepare(const std::string& sql);

    // Retrieves the ID of the last inserted row.
    // Throws SQLiteException if database not connected.
    long long getLastInsertRowId();

private:
    std::string dbPath;
    sqlite3* db; // Pointer to the SQLite database connection

    // Static callback function for sqlite3_exec (not used for parameterized queries).
    static int callback(void* data, int argc, char** argv, char** azColName);

    // Disable copy constructor and assignment operator for proper resource management
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;
};

// Wrapper class for SQLite prepared statements.
class Statement {
public:
    // Constructor takes an sqlite3_stmt pointer.
    explicit Statement(sqlite3_stmt* stmt = nullptr);

    // Destructor finalizes the statement.
    ~Statement();

    // Bind methods for various data types.
    void bind(int index, int value);
    void bind(int index, long long value);
    void bind(int index, double value);
    void bind(int index, const std::string& value);
    void bindNull(int index);

    // Steps the statement to the next row (for SELECT queries).
    // Returns true if a row is available, false if done.
    bool step();

    // Executes the statement (for INSERT, UPDATE, DELETE queries).
    // Returns true on success.
    bool execute();

    // Resets the statement, clearing bindings and preparing for reuse.
    void reset();

    // Finalizes the statement, releasing resources.
    void finalize();

    // Retrieve column values by index.
    int getInt(int index);
    long long getLong(int index);
    double getDouble(int index);
    std::string getString(int index);
    bool isNull(int index);

    // Disable copy constructor and assignment operator
    Statement(const Statement&) = delete;
    Statement& operator=(const Statement&) = delete;

    // Move constructor and assignment operator
    Statement(Statement&& other) noexcept : stmt(other.stmt) { other.stmt = nullptr; }
    Statement& operator=(Statement&& other) noexcept {
        if (this != &other) {
            finalize();
            stmt = other.stmt;
            other.stmt = nullptr;
        }
        return *this;
    }

private:
    sqlite3_stmt* stmt; // Pointer to the SQLite prepared statement
};

#endif // DATABASE_HPP
```
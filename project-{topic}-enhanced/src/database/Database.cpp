```cpp
#include "Database.hpp"
#include "../logger/Logger.hpp"
#include <stdexcept>
#include <string>

// SQLite callback function (unused for direct queries but good practice)
int Database::callback(void* data, int argc, char** argv, char** azColName) {
    // This callback is usually for sqlite3_exec, which we avoid for parameterized queries.
    // For direct exec, you would process rows here.
    return 0;
}

Database::Database(const std::string& dbPath) : dbPath(dbPath), db(nullptr) {
    // Constructor, doesn't open connection immediately
}

Database::~Database() {
    disconnect(); // Ensure connection is closed on destruction
}

// Establishes a connection to the SQLite database.
void Database::connect() {
    if (db) {
        Logger::warn("Database: Already connected to {}.", dbPath);
        return;
    }

    int rc = sqlite3_open(dbPath.c_str(), &db);
    if (rc != SQLITE_OK) {
        Logger::error("Database: Cannot open database {}: {}", dbPath, sqlite3_errmsg(db));
        sqlite3_close(db);
        db = nullptr;
        throw SQLiteException(std::string("Cannot open database: ") + sqlite3_errmsg(db));
    }
    Logger::info("Database: Connected to {}.", dbPath);

    // Enable foreign key constraints (important for data integrity)
    execute("PRAGMA foreign_keys = ON;");
    Logger::debug("Database: Foreign key constraints enabled.");
}

// Disconnects from the SQLite database.
void Database::disconnect() {
    if (db) {
        sqlite3_close(db);
        db = nullptr;
        Logger::info("Database: Disconnected from {}.", dbPath);
    }
}

// Executes a non-query SQL statement (e.g., INSERT, UPDATE, DELETE, CREATE TABLE).
bool Database::execute(const std::string& sql) {
    if (!db) {
        throw SQLiteException("Database not connected.");
    }
    char* errMsg = nullptr;
    int rc = sqlite3_exec(db, sql.c_str(), callback, 0, &errMsg);
    if (rc != SQLITE_OK) {
        std::string error = std::string("SQL error in execute: ") + errMsg + " SQL: " + sql;
        Logger::error("Database: {}", error);
        sqlite3_free(errMsg);
        throw SQLiteException(error);
    }
    Logger::debug("Database: Executed SQL: {}", sql);
    return true;
}

// Prepares an SQL statement for execution, returning a Statement object.
Statement Database::prepare(const std::string& sql) {
    if (!db) {
        throw SQLiteException("Database not connected.");
    }
    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::string error = std::string("Failed to prepare statement: ") + sqlite3_errmsg(db) + " SQL: " + sql;
        Logger::error("Database: {}", error);
        throw SQLiteException(error);
    }
    Logger::debug("Database: Prepared SQL: {}", sql);
    return Statement(stmt);
}

// Retrieves the ID of the last inserted row.
long long Database::getLastInsertRowId() {
    if (!db) {
        throw SQLiteException("Database not connected.");
    }
    return sqlite3_last_insert_rowid(db);
}


// --- Statement Class Implementation ---

Statement::Statement(sqlite3_stmt* stmt) : stmt(stmt) {}

Statement::~Statement() {
    finalize(); // Ensure statement is finalized on destruction
}

// Binds an integer value to a parameter.
void Statement::bind(int index, int value) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    int rc = sqlite3_bind_int(stmt, index, value);
    if (rc != SQLITE_OK) throw SQLiteException(std::string("Failed to bind int: ") + sqlite3_errstr(rc));
}

// Binds a long long value to a parameter.
void Statement::bind(int index, long long value) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    int rc = sqlite3_bind_int64(stmt, index, value);
    if (rc != SQLITE_OK) throw SQLiteException(std::string("Failed to bind long long: ") + sqlite3_errstr(rc));
}

// Binds a double value to a parameter.
void Statement::bind(int index, double value) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    int rc = sqlite3_bind_double(stmt, index, value);
    if (rc != SQLITE_OK) throw SQLiteException(std::string("Failed to bind double: ") + sqlite3_errstr(rc));
}

// Binds a string value to a parameter.
void Statement::bind(int index, const std::string& value) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    int rc = sqlite3_bind_text(stmt, index, value.c_str(), -1, SQLITE_TRANSIENT);
    if (rc != SQLITE_OK) throw SQLiteException(std::string("Failed to bind text: ") + sqlite3_errstr(rc));
}

// Binds a null value to a parameter.
void Statement::bindNull(int index) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    int rc = sqlite3_bind_null(stmt, index);
    if (rc != SQLITE_OK) throw SQLiteException(std::string("Failed to bind null: ") + sqlite3_errstr(rc));
}

// Executes the statement, stepping through the results.
bool Statement::step() {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_ROW) {
        return true;
    } else if (rc == SQLITE_DONE) {
        return false;
    } else {
        throw SQLiteException(std::string("Failed to step statement: ") + sqlite3_errmsg(sqlite3_db_handle(stmt)));
    }
}

// Executes the statement without expecting results (e.g., INSERT, UPDATE, DELETE).
bool Statement::execute() {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    int rc = sqlite3_step(stmt);
    if (rc == SQLITE_DONE) {
        reset(); // Reset for potential reuse
        return true;
    } else {
        throw SQLiteException(std::string("Failed to execute statement: ") + sqlite3_errmsg(sqlite3_db_handle(stmt)));
    }
}

// Resets the statement to its initial state, ready for new bind values.
void Statement::reset() {
    if (stmt) {
        sqlite3_reset(stmt);
        sqlite3_clear_bindings(stmt);
    }
}

// Finalizes the statement, releasing resources.
void Statement::finalize() {
    if (stmt) {
        sqlite3_finalize(stmt);
        stmt = nullptr;
    }
}

// Retrieves an integer column value.
int Statement::getInt(int index) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    return sqlite3_column_int(stmt, index);
}

// Retrieves a long long column value.
long long Statement::getLong(int index) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    return sqlite3_column_int64(stmt, index);
}

// Retrieves a double column value.
double Statement::getDouble(int index) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    return sqlite3_column_double(stmt, index);
}

// Retrieves a string column value.
std::string Statement::getString(int index) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    if (sqlite3_column_type(stmt, index) == SQLITE_NULL) {
        return ""; // Or std::string() or std::nullopt if using C++17 optional
    }
    const unsigned char* text = sqlite3_column_text(stmt, index);
    return text ? reinterpret_cast<const char*>(text) : "";
}

// Checks if a column value is NULL.
bool Statement::isNull(int index) {
    if (!stmt) throw SQLiteException("Statement is not valid.");
    return sqlite3_column_type(stmt, index) == SQLITE_NULL;
}
```
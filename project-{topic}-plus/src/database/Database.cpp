```cpp
#include "Database.h"
#include <stdexcept>
#include <sstream>

namespace TaskManager {
namespace Database {

Database::Database() : db_connection(nullptr) {
    // Constructor is private, instance created via getInstance()
}

Database::~Database() {
    disconnect();
}

Database& Database::getInstance() {
    static Database instance;
    return instance;
}

void Database::connect(const std::string& dbPath) {
    if (db_connection) {
        Utils::Logger::getLogger()->warn("Database already connected to {}", db_path);
        return;
    }

    db_path = dbPath;
    int rc = sqlite3_open(db_path.c_str(), &db_connection);

    if (rc != SQLITE_OK) {
        std::string error_msg = sqlite3_errmsg(db_connection);
        sqlite3_close(db_connection);
        db_connection = nullptr; // Ensure db_connection is null on failure
        Utils::Logger::getLogger()->critical("Cannot open database: {}", error_msg);
        throw Exceptions::DatabaseException("Failed to connect to database: " + error_msg);
    }
    Utils::Logger::getLogger()->info("Connected to database: {}", db_path);

    // Enable foreign key constraints (they are off by default in SQLite until enabled)
    execute("PRAGMA foreign_keys = ON;");
}

void Database::disconnect() {
    if (db_connection) {
        sqlite3_close(db_connection);
        db_connection = nullptr;
        Utils::Logger::getLogger()->info("Disconnected from database: {}", db_path);
    }
}

void Database::execute(const std::string& sql) {
    if (!db_connection) {
        Utils::Logger::getLogger()->error("Database not connected when trying to execute SQL: {}", sql);
        throw Exceptions::DatabaseException("Database not connected.");
    }

    char* errMsg = nullptr;
    int rc = sqlite3_exec(db_connection, sql.c_str(), nullptr, nullptr, &errMsg);

    if (rc != SQLITE_OK) {
        std::string error_msg = errMsg ? errMsg : "Unknown error";
        Utils::Logger::getLogger()->error("SQL error: {} in statement: {}", error_msg, sql);
        sqlite3_free(errMsg);
        throw Exceptions::DatabaseException("SQL execution failed: " + error_msg);
    }
    Utils::Logger::getLogger()->debug("SQL executed: {}", sql);
}

ResultSet Database::query(const std::string& sql) {
    if (!db_connection) {
        Utils::Logger::getLogger()->error("Database not connected when trying to query SQL: {}", sql);
        throw Exceptions::DatabaseException("Database not connected.");
    }

    ResultSet results;
    char* errMsg = nullptr;
    int rc = sqlite3_exec(db_connection, sql.c_str(), callback, &results, &errMsg);

    if (rc != SQLITE_OK) {
        std::string error_msg = errMsg ? errMsg : "Unknown error";
        Utils::Logger::getLogger()->error("SQL error: {} in query: {}", error_msg, sql);
        sqlite3_free(errMsg);
        throw Exceptions::DatabaseException("SQL query failed: " + error_msg);
    }
    Utils::Logger::getLogger()->debug("SQL queried: {} returned {} rows.", sql, results.size());
    return results;
}

int Database::callback(void* data, int argc, char** argv, char** azColName) {
    ResultSet* results = static_cast<ResultSet*>(data);
    Row row;
    for (int i = 0; i < argc; i++) {
        row[azColName[i]] = argv[i] ? argv[i] : "";
    }
    results->push_back(row);
    return 0; // Continue processing rows
}

void Database::bindParams(sqlite3_stmt* stmt, const std::vector<std::string>& params) {
    for (size_t i = 0; i < params.size(); ++i) {
        int rc = sqlite3_bind_text(stmt, i + 1, params[i].c_str(), -1, SQLITE_TRANSIENT);
        if (rc != SQLITE_OK) {
            Utils::Logger::getLogger()->error("Failed to bind parameter {} (value: {}): {}", i + 1, params[i], sqlite3_errmsg(db_connection));
            throw Exceptions::DatabaseException("Failed to bind parameter.");
        }
    }
}

ResultSet Database::preparedQuery(const std::string& sql, const std::vector<std::string>& params) {
    if (!db_connection) {
        Utils::Logger::getLogger()->error("Database not connected for prepared query: {}", sql);
        throw Exceptions::DatabaseException("Database not connected.");
    }

    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_connection, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        Utils::Logger::getLogger()->error("Failed to prepare statement: {} for SQL: {}", sqlite3_errmsg(db_connection), sql);
        throw Exceptions::DatabaseException("Failed to prepare statement: " + std::string(sqlite3_errmsg(db_connection)));
    }

    bindParams(stmt, params);

    ResultSet results;
    while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {
        Row row;
        int col_count = sqlite3_column_count(stmt);
        for (int i = 0; i < col_count; ++i) {
            row[sqlite3_column_name(stmt, i)] = reinterpret_cast<const char*>(sqlite3_column_text(stmt, i));
        }
        results.push_back(row);
    }

    if (rc != SQLITE_DONE) {
        Utils::Logger::getLogger()->error("Prepared query step failed: {} for SQL: {}", sqlite3_errmsg(db_connection), sql);
        sqlite3_finalize(stmt);
        throw Exceptions::DatabaseException("Prepared query execution failed: " + std::string(sqlite3_errmsg(db_connection)));
    }

    sqlite3_finalize(stmt);
    Utils::Logger::getLogger()->debug("Prepared query: {} with params: {} returned {} rows.", sql, fmt::join(params, ", "), results.size());
    return results;
}

void Database::preparedExecute(const std::string& sql, const std::vector<std::string>& params) {
    if (!db_connection) {
        Utils::Logger::getLogger()->error("Database not connected for prepared execute: {}", sql);
        throw Exceptions::DatabaseException("Database not connected.");
    }

    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db_connection, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        Utils::Logger::getLogger()->error("Failed to prepare statement: {} for SQL: {}", sqlite3_errmsg(db_connection), sql);
        throw Exceptions::DatabaseException("Failed to prepare statement: " + std::string(sqlite3_errmsg(db_connection)));
    }

    bindParams(stmt, params);

    rc = sqlite3_step(stmt);
    if (rc != SQLITE_DONE) {
        Utils::Logger::getLogger()->error("Prepared execute step failed: {} for SQL: {}", sqlite3_errmsg(db_connection), sql);
        sqlite3_finalize(stmt);
        throw Exceptions::DatabaseException("Prepared execute failed: " + std::string(sqlite3_errmsg(db_connection)));
    }

    sqlite3_finalize(stmt);
    Utils::Logger::getLogger()->debug("Prepared execute: {} with params: {} completed.", sql, fmt::join(params, ", "));
}

long long Database::getLastInsertRowId() {
    if (!db_connection) {
        Utils::Logger::getLogger()->error("Database not connected when getting last insert row ID.");
        throw Exceptions::DatabaseException("Database not connected.");
    }
    return sqlite3_last_insert_rowid(db_connection);
}

void Database::beginTransaction() {
    execute("BEGIN TRANSACTION;");
    Utils::Logger::getLogger()->info("Transaction begun.");
}

void Database::commitTransaction() {
    execute("COMMIT;");
    Utils::Logger::getLogger()->info("Transaction committed.");
}

void Database::rollbackTransaction() {
    execute("ROLLBACK;");
    Utils::Logger::getLogger()->warn("Transaction rolled back.");
}

} // namespace Database
} // namespace TaskManager
```
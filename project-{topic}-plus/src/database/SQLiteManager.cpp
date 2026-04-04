#include "SQLiteManager.h"
#include "utils/Logger.h"
#include <stdexcept>

namespace tm_api {
namespace database {

SQLiteManager::SQLiteManager(const std::string& dbPath) : dbPath(dbPath), db(nullptr) {
    open(); // Open connection on construction
}

SQLiteManager::~SQLiteManager() {
    close(); // Close connection on destruction
}

void SQLiteManager::open() {
    std::lock_guard<std::mutex> lock(dbMutex);
    if (db) {
        LOG_WARN("SQLite database already open at {}", dbPath);
        return;
    }
    int rc = sqlite3_open(dbPath.c_str(), &db);
    if (rc) {
        LOG_CRITICAL("Can't open database: {}", sqlite3_errmsg(db));
        db = nullptr; // Ensure db is null if opening fails
        throw std::runtime_error("Failed to open database: " + std::string(sqlite3_errmsg(db)));
    }
    LOG_INFO("SQLite database opened successfully at {}", dbPath);
    // Enable WAL mode for better concurrency
    execute("PRAGMA journal_mode = WAL;");
    execute("PRAGMA foreign_keys = ON;"); // Enforce foreign key constraints
}

void SQLiteManager::close() {
    std::lock_guard<std::mutex> lock(dbMutex);
    if (db) {
        sqlite3_close(db);
        db = nullptr;
        LOG_INFO("SQLite database closed.");
    }
}

SQLiteResult SQLiteManager::execute(const std::string& sql, const std::vector<std::string>& params) {
    if (!db) {
        throw std::runtime_error("Database is not open.");
    }

    if (params.empty()) {
        char* errMsg = nullptr;
        int rc = sqlite3_exec(db, sql.c_str(), callback, nullptr, &errMsg);
        if (rc != SQLITE_OK) {
            std::string error = errMsg ? errMsg : "Unknown error";
            LOG_ERROR("SQL error (execute): {} - SQL: {}", error, sql);
            sqlite3_free(errMsg);
            return {false, error, {}, {}};
        }
        return {true, "Operation successful", {}, {}};
    } else {
        return prepareExecute(sql, params); // Use prepared statements for params
    }
}

SQLiteResult SQLiteManager::query(const std::string& sql, const std::vector<std::string>& params) {
    if (!db) {
        throw std::runtime_error("Database is not open.");
    }

    if (params.empty()) {
        SQLiteResult result = {true, "Query successful"};
        char* errMsg = nullptr;
        int rc = sqlite3_exec(db, sql.c_str(), callback, &result, &errMsg);
        if (rc != SQLITE_OK) {
            std::string error = errMsg ? errMsg : "Unknown error";
            LOG_ERROR("SQL error (query): {} - SQL: {}", error, sql);
            sqlite3_free(errMsg);
            return {false, error, {}, {}};
        }
        return result;
    } else {
        return prepareQuery(sql, params); // Use prepared statements for params
    }
}

SQLiteResult SQLiteManager::prepareExecute(const std::string& sql, const std::vector<std::string>& params) {
    return executeInternal(sql, [&](sqlite3_stmt* stmt) {
        for (size_t i = 0; i < params.size(); ++i) {
            sqlite3_bind_text(stmt, i + 1, params[i].c_str(), -1, SQLITE_TRANSIENT);
        }
    });
}

SQLiteResult SQLiteManager::prepareQuery(const std::string& sql, const std::vector<std::string>& params) {
    SQLiteResult result = {true, "Query successful"};
    
    executeInternal(sql, [&](sqlite3_stmt* stmt) {
        for (size_t i = 0; i < params.size(); ++i) {
            sqlite3_bind_text(stmt, i + 1, params[i].c_str(), -1, SQLITE_TRANSIENT);
        }

        // Process query results
        bool headers_read = false;
        while (sqlite3_step(stmt) == SQLITE_ROW) {
            if (!headers_read) {
                int colCount = sqlite3_column_count(stmt);
                for (int i = 0; i < colCount; ++i) {
                    result.columnNames.push_back(sqlite3_column_name(stmt, i));
                }
                headers_read = true;
            }
            std::vector<std::string> row;
            int colCount = sqlite3_column_count(stmt);
            for (int i = 0; i < colCount; ++i) {
                const char* val = (const char*)sqlite3_column_text(stmt, i);
                row.push_back(val ? val : "");
            }
            result.rows.push_back(row);
        }
    });
    return result;
}

SQLiteResult SQLiteManager::executeInternal(const std::string& sql, const std::function<void(sqlite3_stmt*)>& bindCallback) {
    std::lock_guard<std::mutex> lock(dbMutex); // Ensure thread safety for statement prep/exec

    if (!db) {
        throw std::runtime_error("Database is not open.");
    }

    sqlite3_stmt* stmt;
    int rc = sqlite3_prepare_v2(db, sql.c_str(), -1, &stmt, nullptr);
    if (rc != SQLITE_OK) {
        std::string error = sqlite3_errmsg(db);
        LOG_ERROR("SQL error (prepare): {} - SQL: {}", error, sql);
        return {false, error, {}, {}};
    }

    if (bindCallback) {
        bindCallback(stmt);
    }

    SQLiteResult result = {true, "Operation successful"};
    rc = sqlite3_step(stmt);

    if (rc != SQLITE_DONE && rc != SQLITE_ROW) { // SQLITE_ROW for queries, SQLITE_DONE for DML
        std::string error = sqlite3_errmsg(db);
        LOG_ERROR("SQL error (step): {} - SQL: {}", error, sql);
        sqlite3_finalize(stmt);
        return {false, error, {}, {}};
    }

    sqlite3_finalize(stmt);
    return result;
}

long long SQLiteManager::lastInsertRowId() const {
    std::lock_guard<std::mutex> lock(dbMutex);
    if (!db) {
        throw std::runtime_error("Database is not open.");
    }
    return sqlite3_last_insert_rowid(db);
}

int SQLiteManager::callback(void* data, int argc, char** argv, char** azColName) {
    // This callback is primarily used by sqlite3_exec for SELECT statements.
    // For prepared statements (query methods), we handle results directly.
    if (!data) return 0; // No data to store results

    SQLiteResult* result = static_cast<SQLiteResult*>(data);

    if (result->columnNames.empty()) {
        for (int i = 0; i < argc; i++) {
            result->columnNames.push_back(azColName[i]);
        }
    }

    std::vector<std::string> row;
    for (int i = 0; i < argc; i++) {
        row.push_back(argv[i] ? argv[i] : "NULL");
    }
    result->rows.push_back(row);
    return 0;
}

} // namespace database
} // namespace tm_api
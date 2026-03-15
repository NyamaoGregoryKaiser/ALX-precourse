#ifndef DATABASE_H
#define DATABASE_H

#include <SQLiteCpp/SQLiteCpp.h>
#include <SQLiteCpp/VariadicBind.h>
#include <string>
#include <memory>
#include <vector>
#include <mutex>
#include <queue>
#include <chrono> // For connection pooling timeout
#include "Logger.h"
#include "../app_config.h"
#include "ErrorHandler.h" // For custom exceptions

// Forward declare for crow::json::wvalue to avoid circular dependency, if needed
// Or simply include crow.h if it's generally fine
#include <crow.h>

// A simple utility to convert SQLite column to JSON
crow::json::wvalue to_json_value(const SQLite::Column& col);

class Database {
private:
    std::string db_path;
    std::queue<std::unique_ptr<SQLite::Database>> connection_pool;
    std::mutex pool_mutex;
    const size_t MAX_POOL_SIZE = 10; // Max connections in pool
    const size_t MIN_POOL_SIZE = 2;  // Min connections to keep alive
    const std::chrono::seconds CONNECTION_TIMEOUT = std::chrono::seconds(5); // Time to wait for a connection

    // Private constructor for singleton
    Database(const std::string& path) : db_path(path) {
        LOG_INFO("Initializing Database instance with path: {}", db_path);
        // Pre-fill pool with minimum connections
        for (size_t i = 0; i < MIN_POOL_SIZE; ++i) {
            try {
                auto db = std::make_unique<SQLite::Database>(db_path, SQLite::OPEN_READWRITE | SQLite::OPEN_CREATE);
                db->exec("PRAGMA foreign_keys = ON;"); // Enable foreign keys
                connection_pool.push(std::move(db));
                LOG_DEBUG("Added connection to pool. Current size: {}", connection_pool.size());
            } catch (const SQLite::Exception& e) {
                LOG_CRITICAL("Failed to open SQLite database at {}: {}", db_path, e.what());
                throw InternalServerException("Failed to initialize database connection.");
            }
        }
    }

    // Delete copy constructor and assignment operator for singleton
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    std::unique_ptr<SQLite::Database> create_connection() {
        try {
            auto db = std::make_unique<SQLite::Database>(db_path, SQLite::OPEN_READWRITE | SQLite::OPEN_CREATE);
            db->exec("PRAGMA foreign_keys = ON;");
            return db;
        } catch (const SQLite::Exception& e) {
            LOG_ERROR("Failed to create new database connection to {}: {}", db_path, e.what());
            throw InternalServerException("Failed to create database connection.");
        }
    }

public:
    // Static method to get the singleton instance
    static Database& getInstance() {
        static Database instance(AppConfig::DATABASE_PATH); // Guaranteed to be destroyed correctly
        return instance;
    }

    // Static method to get a test instance (for integration tests)
    static Database& getTestInstance() {
        static Database instance(AppConfig::TEST_DATABASE_PATH);
        return instance;
    }

    // Get a database connection from the pool or create a new one
    std::unique_ptr<SQLite::Database> getConnection() {
        std::unique_lock<std::mutex> lock(pool_mutex);
        if (!connection_pool.empty()) {
            std::unique_ptr<SQLite::Database> db = std::move(connection_pool.front());
            connection_pool.pop();
            LOG_DEBUG("Reusing database connection from pool. Remaining: {}", connection_pool.size());
            return db;
        } else if (MAX_POOL_SIZE == 0 || connection_pool.size() < MAX_POOL_SIZE) {
            LOG_DEBUG("Creating new database connection. Pool size: {}", connection_pool.size());
            return create_connection();
        } else {
            // Pool is full, and no connections available. Wait or throw.
            // For simplicity, we'll throw here. In a real scenario, use condition_variable to wait.
            LOG_WARN("Database connection pool exhausted. Max size: {}", MAX_POOL_SIZE);
            throw InternalServerException("Database connection pool exhausted.");
        }
    }

    // Return a database connection to the pool
    void releaseConnection(std::unique_ptr<SQLite::Database> db) {
        if (!db) return;

        std::unique_lock<std::mutex> lock(pool_mutex);
        if (connection_pool.size() < MAX_POOL_SIZE) {
            connection_pool.push(std::move(db));
            LOG_DEBUG("Released database connection to pool. Current size: {}", connection_pool.size());
        } else {
            // Pool is full, close the connection
            LOG_DEBUG("Database connection pool full. Closing connection.");
        }
    }

    // Execute an SQL statement (INSERT, UPDATE, DELETE)
    // Returns the number of affected rows
    template <typename... Args>
    int execute(const std::string& sql, Args&&... args) {
        auto db = getConnection();
        try {
            SQLite::Statement query(*db, sql);
            SQLite::bind(query, std::forward<Args>(args)...);
            int rows_affected = query.exec();
            LOG_DEBUG("Executed SQL: {} | Affected rows: {}", sql, rows_affected);
            releaseConnection(std::move(db));
            return rows_affected;
        } catch (const SQLite::Exception& e) {
            LOG_ERROR("Database execute error: {} | SQL: {}", e.what(), sql);
            releaseConnection(std::move(db));
            // Translate common SQLite errors to application exceptions
            if (e.get = SQLite::Exception::Constraint) {
                if (std::string(e.what()).find("UNIQUE constraint failed") != std::string::npos) {
                    throw ConflictException(e.what());
                } else if (std::string(e.what()).find("FOREIGN KEY constraint failed") != std::string::npos) {
                    throw BadRequestException("Foreign key constraint failed: " + std::string(e.what()));
                }
            }
            throw InternalServerException(e.what());
        }
    }

    // Execute a query that returns results (SELECT)
    // Returns a vector of JSON objects
    template <typename... Args>
    std::vector<crow::json::wvalue> query(const std::string& sql, Args&&... args) {
        auto db = getConnection();
        std::vector<crow::json::wvalue> results;
        try {
            SQLite::Statement query(*db, sql);
            SQLite::bind(query, std::forward<Args>(args)...);

            while (query.executeStep()) {
                crow::json::wvalue row_json;
                for (int i = 0; i < query.getColumnCount(); ++i) {
                    row_json[query.getColumnName(i)] = to_json_value(query.getColumn(i));
                }
                results.push_back(std::move(row_json));
            }
            LOG_DEBUG("Executed SQL query: {} | Rows returned: {}", sql, results.size());
            releaseConnection(std::move(db));
            return results;
        } catch (const SQLite::Exception& e) {
            LOG_ERROR("Database query error: {} | SQL: {}", e.what(), sql);
            releaseConnection(std::move(db));
            throw InternalServerException(e.what());
        }
    }

    // Get the ID of the last inserted row
    long long lastInsertRowId() {
        auto db = getConnection();
        long long id = db->getLastInsertRowid();
        releaseConnection(std::move(db));
        return id;
    }

    // Utility function to apply schema/seed for tests
    void applySchemaAndSeed(const std::string& schema_path, const std::string& seed_path) {
        auto db = getConnection();
        try {
            db->exec("PRAGMA foreign_keys = OFF;"); // Disable FKs for schema/seed application to avoid issues
            db->exec("DELETE FROM order_items;");
            db->exec("DELETE FROM orders;");
            db->exec("DELETE FROM products;");
            db->exec("DELETE FROM users;");
            db->exec("VACUUM;"); // Reclaim space
            db->exec("PRAGMA foreign_keys = ON;");

            std::ifstream schema_file(schema_path);
            if (!schema_file.is_open()) {
                throw std::runtime_error("Could not open schema file: " + schema_path);
            }
            std::string schema_sql((std::istreambuf_iterator<char>(schema_file)), std::istreambuf_iterator<char>());
            db->exec(schema_sql);
            LOG_INFO("Schema applied from {}", schema_path);

            std::ifstream seed_file(seed_path);
            if (!seed_file.is_open()) {
                throw std::runtime_error("Could not open seed file: " + seed_path);
            }
            std::string seed_sql((std::istreambuf_iterator<char>(seed_file)), std::istreambuf_iterator<char>());
            db->exec(seed_sql);
            LOG_INFO("Seed data applied from {}", seed_path);
        } catch (const std::exception& e) {
            LOG_CRITICAL("Failed to apply schema/seed to test database: {}", e.what());
            releaseConnection(std::move(db));
            throw InternalServerException(e.what());
        }
        releaseConnection(std::move(db));
    }
};

// Helper function definition for converting SQLite::Column to crow::json::wvalue
inline crow::json::wvalue to_json_value(const SQLite::Column& col) {
    switch (col.getType()) {
        case SQLite::Column::Type::Integer:
            return col.getInt64();
        case SQLite::Column::Type::Float:
            return col.getDouble();
        case SQLite::Column::Type::Text:
            return std::string(col.getText());
        case SQLite::Column::Type::Blob:
            // Handle blob data if necessary, perhaps base64 encode
            return crow::json::wvalue(); // Or throw/handle specifically
        case SQLite::Column::Type::Null:
        default:
            return crow::json::wvalue(); // Null
    }
}


#endif // DATABASE_H
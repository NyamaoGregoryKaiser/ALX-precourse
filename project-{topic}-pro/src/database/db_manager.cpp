```cpp
#include "db_manager.h"
#include "../common/config.h"
#include "../common/logger.h"
#include "../common/error_handler.h"
#include <chrono>
#include <thread>

DatabaseManager& DatabaseManager::getInstance() {
    static DatabaseManager instance;
    return instance;
}

DatabaseManager::DatabaseManager() {
    Config& config = Config::getInstance();
    std::string host = config.getString("database.host");
    int port = config.getInt("database.port");
    std::string user = config.getString("database.user");
    std::string password = config.getString("database.password");
    std::string dbname = config.getString("database.dbname");

    connInfo = "host=" + host + " port=" + std::to_string(port) +
               " user=" + user + " password=" + password +
               " dbname=" + dbname;

    Logger::info("DatabaseManager", "Database connection string: {}", connInfo);

    // Populate initial connections
    for (size_t i = 0; i < MAX_CONNECTIONS / 2; ++i) { // Start with half pool size
        try {
            connectionPool.push_back(createAndConnect(connInfo));
            Logger::debug("DatabaseManager", "Initial connection #{} established.", i + 1);
        } catch (const pqxx::sql_error& e) {
            Logger::critical("DatabaseManager", "Failed to establish initial database connection: {}", e.what());
            // It's critical, but we might continue with other features or fail later if needed.
        } catch (const std::exception& e) {
            Logger::critical("DatabaseManager", "Failed to establish initial database connection due to generic error: {}", e.what());
        }
    }
    Logger::info("DatabaseManager", "DatabaseManager initialized with {} initial connections.", connectionPool.size());
}

DatabaseManager::~DatabaseManager() {
    Logger::info("DatabaseManager", "Shutting down DatabaseManager. Closing {} connections.", connectionPool.size());
    // Connections will be closed automatically when shared_ptr goes out of scope
}

std::shared_ptr<pqxx::connection> DatabaseManager::createAndConnect(const std::string& connInfo) {
    try {
        auto conn = std::make_shared<pqxx::connection>(connInfo);
        if (conn->is_open()) {
            Logger::debug("DatabaseManager", "Successfully created new database connection.");
            return conn;
        } else {
            throw DatabaseException("Failed to open database connection.");
        }
    } catch (const pqxx::sql_error& e) {
        throw DatabaseException("SQL Error during connection: " + std::string(e.what()));
    } catch (const std::exception& e) {
        throw DatabaseException("Generic error during connection: " + std::string(e.what()));
    }
}

std::shared_ptr<pqxx::connection> DatabaseManager::getConnection() {
    std::unique_lock<std::mutex> lock(poolMutex);
    if (!connectionPool.empty()) {
        std::shared_ptr<pqxx::connection> conn = connectionPool.back();
        connectionPool.pop_back();
        
        // Basic check if connection is still valid (lightweight ping)
        try {
            pqxx::nontransaction N(*conn);
            N.exec("SELECT 1");
            Logger::debug("DatabaseManager", "Reusing connection from pool. Pool size: {}", connectionPool.size());
            return conn;
        } catch (const pqxx::broken_connection& e) {
            Logger::warn("DatabaseManager", "Broken connection detected, discarding and creating new one: {}", e.what());
            // Connection is broken, discard it and try to get a new one or create
            return createAndConnect(connInfo); // This will throw on failure
        } catch (const pqxx::sql_error& e) {
            Logger::warn("DatabaseManager", "Error during connection check, assuming broken: {}", e.what());
            return createAndConnect(connInfo); // This will throw on failure
        }
    }

    // If pool is empty, create a new one, up to MAX_CONNECTIONS
    if (connectionPool.size() < MAX_CONNECTIONS) {
        Logger::info("DatabaseManager", "Connection pool empty, creating new connection. Current size: {}", connectionPool.size());
        return createAndConnect(connInfo);
    } else {
        Logger::error("DatabaseManager", "Connection pool exhausted. Max connections reached ({}).", MAX_CONNECTIONS);
        throw ServiceUnavailableException("Database connection pool exhausted.");
    }
}

void DatabaseManager::releaseConnection(std::shared_ptr<pqxx::connection> conn) {
    if (conn) {
        std::unique_lock<std::mutex> lock(poolMutex);
        if (connectionPool.size() < MAX_CONNECTIONS) {
            connectionPool.push_back(conn);
            Logger::debug("DatabaseManager", "Connection returned to pool. Pool size: {}", connectionPool.size());
        } else {
            Logger::warn("DatabaseManager", "Connection pool full, discarding connection. Current size: {}", connectionPool.size());
            // Connection will be closed when shared_ptr goes out of scope
        }
    }
}
```
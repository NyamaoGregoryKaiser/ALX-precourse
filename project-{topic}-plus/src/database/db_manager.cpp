#include "db_manager.h"
#include <iostream>
#include <thread> // For sleep_for

DbManager& DbManager::getInstance(const std::string& conn_str) {
    static DbManager instance(conn_str);
    return instance;
}

DbManager::DbManager(const std::string& conn_str) : connection_string(conn_str) {
    if (connection_string.empty()) {
        Logger::error("DbManager: Connection string is empty. Please provide a valid connection string.");
        throw std::runtime_error("Database connection string cannot be empty.");
    }
    initializePool();
    Logger::info("DbManager: Connection pool initialized with {} connections.", connection_pool.size());
}

DbManager::~DbManager() {
    std::lock_guard<std::mutex> lock(pool_mutex);
    while (!connection_pool.empty()) {
        connection_pool.pop(); // Connections will close automatically
    }
    Logger::info("DbManager: Connection pool destroyed.");
}

std::unique_ptr<pqxx::connection> DbManager::createConnection() {
    int retries = 5;
    while (retries > 0) {
        try {
            auto conn = std::make_unique<pqxx::connection>(connection_string);
            Logger::debug("DbManager: Successfully created new database connection.");
            return conn;
        } catch (const pqxx::broken_connection& e) {
            Logger::error("DbManager: Broken database connection while creating: {}", e.what());
            retries--;
            if (retries == 0) throw;
            Logger::warn("DbManager: Retrying database connection in 2 seconds ({} retries left)...", retries);
            std::this_thread::sleep_for(std::chrono::seconds(2));
        } catch (const pqxx::sql_error& e) {
            Logger::error("DbManager: SQL error while creating connection: {}", e.what());
            throw;
        } catch (const std::exception& e) {
            Logger::error("DbManager: Error creating database connection: {}", e.what());
            throw;
        }
    }
    throw std::runtime_error("Failed to create database connection after multiple retries.");
}

void DbManager::initializePool() {
    std::lock_guard<std::mutex> lock(pool_mutex);
    for (size_t i = 0; i < MIN_POOL_SIZE; ++i) {
        try {
            connection_pool.push(createConnection());
        } catch (const std::exception& e) {
            Logger::critical("DbManager: Failed to initialize connection pool: {}", e.what());
            throw; // Re-throw to indicate a critical setup failure
        }
    }
}

pqxx::connection& DbManager::getConnection() {
    std::unique_ptr<pqxx::connection> conn;
    std::unique_lock<std::mutex> lock(pool_mutex);

    if (!connection_pool.empty()) {
        conn = std::move(connection_pool.front());
        connection_pool.pop();
        Logger::debug("DbManager: Reused connection from pool. Pool size: {}", connection_pool.size());
    } else {
        // Pool is empty, create a new connection if under max size
        if (connection_pool.size() < MAX_POOL_SIZE) {
            lock.unlock(); // Release lock temporarily to create connection
            conn = createConnection();
            lock.lock(); // Reacquire lock
            Logger::debug("DbManager: Created new connection (pool was empty). Pool size: {}", connection_pool.size());
        } else {
            // Pool is full and empty, wait for a connection to be released
            // This is a simplified approach. In a real scenario, you'd use a condition variable.
            Logger::warn("DbManager: Connection pool exhausted. Waiting for a connection...");
            // For now, let's just create a new one, but this could lead to exceeding MAX_POOL_SIZE
            // if many requests come in concurrently. A proper solution involves a wait queue.
            lock.unlock(); // Release lock temporarily
            conn = createConnection();
            lock.lock(); // Reacquire lock
            Logger::debug("DbManager: Created new connection (pool exhausted). Pool size: {}", connection_pool.size());
        }
    }
    return *conn.release(); // Return raw pointer for the caller to manage lifetime,
                            // or better, pass ownership via shared_ptr/unique_ptr, or use a RAII wrapper.
                            // Here, we'll use a RAII wrapper (ConnectionGuard) in the services.
}

void DbManager::releaseConnection(std::unique_ptr<pqxx::connection> conn) {
    if (conn && conn->is_open()) {
        std::lock_guard<std::mutex> lock(pool_mutex);
        if (connection_pool.size() < MAX_POOL_SIZE) {
            connection_pool.push(std::move(conn));
            Logger::debug("DbManager: Released connection to pool. Pool size: {}", connection_pool.size());
        } else {
            Logger::warn("DbManager: Connection pool full, closing connection instead of returning to pool.");
            // Connection will be closed when unique_ptr goes out of scope
        }
    } else {
        Logger::warn("DbManager: Attempted to release a null or closed connection.");
    }
}
```
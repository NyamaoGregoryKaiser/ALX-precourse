#pragma once

#include <pqxx/pqxx>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <queue>
#include "../utils/logger.h"

class DbManager {
public:
    static DbManager& getInstance(const std::string& conn_str = "");
    pqxx::connection& getConnection(); // Gets a connection from the pool
    void releaseConnection(std::unique_ptr<pqxx::connection> conn); // Returns a connection to the pool

    // Delete copy constructor and assignment operator for singleton
    DbManager(const DbManager&) = delete;
    DbManager& operator=(const DbManager&) = delete;

private:
    DbManager(const std::string& conn_str);
    ~DbManager();

    std::string connection_string;
    std::queue<std::unique_ptr<pqxx::connection>> connection_pool;
    std::mutex pool_mutex;
    const size_t MAX_POOL_SIZE = 10; // Maximum number of connections in the pool
    const size_t MIN_POOL_SIZE = 2;  // Minimum number of connections to maintain

    void initializePool();
    std::unique_ptr<pqxx::connection> createConnection();
};

// RAII wrapper for connection acquisition and release
class ConnectionGuard {
public:
    explicit ConnectionGuard(DbManager& db_manager) : db_manager_(db_manager) {
        conn_ = db_manager_.getConnection();
    }

    ~ConnectionGuard() {
        if (conn_.is_open()) {
            db_manager_.releaseConnection(std::make_unique<pqxx::connection>(std::move(conn_)));
        }
    }

    pqxx::connection& operator*() { return conn_; }
    pqxx::connection* operator->() { return &conn_; }

private:
    DbManager& db_manager_;
    pqxx::connection conn_;
};
```
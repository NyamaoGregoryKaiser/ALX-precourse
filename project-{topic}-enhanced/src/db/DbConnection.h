#pragma once

#include <pqxx/pqxx>
#include <string>
#include <vector>
#include <mutex>
#include <condition_variable>
#include <memory>
#include <stdexcept>

class DbException : public std::runtime_error {
public:
    explicit DbException(const std::string& message) : std::runtime_error(message) {}
};

// Represents a wrapper for a pqxx::connection
class PooledConnection {
public:
    explicit PooledConnection(const std::string& conn_str);
    pqxx::connection& get();
    void reset(); // Reset connection state if necessary

private:
    std::unique_ptr<pqxx::connection> conn_;
    std::string conn_str_; // Store connection string for reconnection
};

// Simple Connection Pool
class DbConnectionPool {
public:
    DbConnectionPool(const std::string& conn_str, size_t pool_size);
    ~DbConnectionPool();

    std::shared_ptr<PooledConnection> getConnection();
    void releaseConnection(std::shared_ptr<PooledConnection> connection);

private:
    std::string conn_str_;
    size_t pool_size_;
    std::vector<std::shared_ptr<PooledConnection>> connections_;
    std::vector<bool> in_use_;
    std::mutex mutex_;
    std::condition_variable condition_;
};

// Global accessor for the connection pool
class DbConnection {
public:
    static void init(const std::string& conn_str, size_t pool_size = 5);
    static DbConnectionPool& getPool();

private:
    static std::unique_ptr<DbConnectionPool> pool_;
    static std::once_flag init_flag_;
};
```
#include "DbConnection.h"
#include "../utils/Logger.h"

// --- PooledConnection Implementation ---
PooledConnection::PooledConnection(const std::string& conn_str) : conn_str_(conn_str) {
    try {
        conn_ = std::make_unique<pqxx::connection>(conn_str_);
        if (!conn_->is_open()) {
            throw DbException("Could not open database connection.");
        }
        LOG_DEBUG("New database connection opened.");
    } catch (const pqxx::broken_connection& e) {
        LOG_ERROR("Failed to open connection (broken): {}", e.what());
        throw DbException("Database connection broken: " + std::string(e.what()));
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to open connection: {}", e.what());
        throw DbException("Database connection error: " + std::string(e.what()));
    }
}

pqxx::connection& PooledConnection::get() {
    if (!conn_ || !conn_->is_open()) {
        LOG_WARN("Connection detected as closed or null. Attempting to reconnect.");
        try {
            conn_ = std::make_unique<pqxx::connection>(conn_str_);
            if (!conn_->is_open()) {
                throw DbException("Reconnection failed.");
            }
            LOG_INFO("Successfully reconnected to database.");
        } catch (const std::exception& e) {
            LOG_ERROR("Failed to reconnect: {}", e.what());
            throw DbException("Database reconnection failed: " + std::string(e.what()));
        }
    }
    return *conn_;
}

void PooledConnection::reset() {
    // Perform any necessary cleanup or transaction rollback
    // For pqxx, typically the connection manages its own transaction state per work object.
    // If there were any uncommitted transactions or session-specific settings, reset them here.
    // For now, assume a fresh `work` object handles this.
    LOG_DEBUG("Pooled connection reset.");
}

// --- DbConnectionPool Implementation ---
DbConnectionPool::DbConnectionPool(const std::string& conn_str, size_t pool_size)
    : conn_str_(conn_str), pool_size_(pool_size) {
    if (pool_size_ == 0) {
        throw DbException("Connection pool size cannot be zero.");
    }
    connections_.reserve(pool_size_);
    in_use_.resize(pool_size_, false);

    for (size_t i = 0; i < pool_size_; ++i) {
        connections_.push_back(std::make_shared<PooledConnection>(conn_str_));
    }
    LOG_INFO("Database connection pool created with {} connections.", pool_size_);
}

DbConnectionPool::~DbConnectionPool() {
    LOG_INFO("Closing database connection pool.");
    // Connections are unique_ptrs within shared_ptrs; they will be destroyed correctly.
}

std::shared_ptr<PooledConnection> DbConnectionPool::getConnection() {
    std::unique_lock<std::mutex> lock(mutex_);
    condition_.wait(lock, [this] {
        for (size_t i = 0; i < pool_size_; ++i) {
            if (!in_use_[i]) return true;
        }
        return false;
    });

    for (size_t i = 0; i < pool_size_; ++i) {
        if (!in_use_[i]) {
            in_use_[i] = true;
            connections_[i]->reset(); // Reset before handing out
            LOG_DEBUG("Acquired connection from pool (index {}).", i);
            return connections_[i];
        }
    }
    // Should not reach here due to condition_.wait
    throw DbException("Failed to acquire connection from pool (unexpected).");
}

void DbConnectionPool::releaseConnection(std::shared_ptr<PooledConnection> connection) {
    std::unique_lock<std::mutex> lock(mutex_);
    for (size_t i = 0; i < pool_size_; ++i) {
        if (connections_[i] == connection) {
            in_use_[i] = false;
            LOG_DEBUG("Released connection to pool (index {}).", i);
            condition_.notify_one();
            return;
        }
    }
    LOG_WARN("Attempted to release an unknown connection to the pool.");
}


// --- DbConnection (Global Accessor) Implementation ---
std::unique_ptr<DbConnectionPool> DbConnection::pool_ = nullptr;
std::once_flag DbConnection::init_flag_;

void DbConnection::init(const std::string& conn_str, size_t pool_size) {
    std::call_once(init_flag_, [&]() {
        pool_ = std::make_unique<DbConnectionPool>(conn_str, pool_size);
    });
}

DbConnectionPool& DbConnection::getPool() {
    if (!pool_) {
        throw DbException("Database connection pool not initialized. Call DbConnection::init() first.");
    }
    return *pool_;
}
```
#include "DatabaseManager.h"
#include <iomanip> // For std::put_time

std::string DatabaseManager::connection_string_;
int DatabaseManager::pool_size_;
std::queue<std::unique_ptr<soci::session>> DatabaseManager::session_pool_;
std::mutex DatabaseManager::pool_mutex_;
std::atomic<bool> DatabaseManager::initialized_ = false;

void DatabaseManager::init(const std::string& connection_string, int pool_size) {
    if (initialized_) {
        LOG_WARN("DatabaseManager already initialized.");
        return;
    }

    connection_string_ = connection_string;
    pool_size_ = pool_size;

    std::lock_guard<std::mutex> lock(pool_mutex_);
    for (int i = 0; i < pool_size_; ++i) {
        try {
            std::unique_ptr<soci::session> sql(new soci::session(soci::postgresql, connection_string_));
            session_pool_.push(std::move(sql));
            LOG_DEBUG("Database session {} created successfully.", i + 1);
        } catch (const soci::soci_error& e) {
            LOG_CRITICAL("Failed to create database session {}: {}", i + 1, e.what());
            throw std::runtime_error("Database initialization failed.");
        }
    }
    initialized_ = true;
    LOG_INFO("Database connection pool created with {} sessions.", pool_size_);
}

soci::session DatabaseManager::get_session() {
    if (!initialized_) {
        throw std::runtime_error("DatabaseManager not initialized. Call init() first.");
    }

    std::unique_lock<std::mutex> lock(pool_mutex_);
    if (session_pool_.empty()) {
        // Option 1: Block until a session is available (e.g., using a condition variable)
        // Option 2: Create a temporary session if pool is empty (less ideal for true pooling)
        // For simplicity, let's create a temporary one, but a real pool would block/wait.
        LOG_WARN("Database session pool is empty. Creating a temporary session.");
        lock.unlock(); // Release lock before creating a new session
        return soci::session(soci::postgresql, connection_string_);
    }

    std::unique_ptr<soci::session> sql = std::move(session_pool_.front());
    session_pool_.pop();
    lock.unlock();
    return *sql; // Return by value (copy) for automatic return to pool or manual release
}

void DatabaseManager::release_session(std::unique_ptr<soci::session> session) {
    if (!session) return;
    std::lock_guard<std::mutex> lock(pool_mutex_);
    session_pool_.push(std::move(session));
}

void DatabaseManager::shutdown() {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    while (!session_pool_.empty()) {
        session_pool_.pop(); // Destructor of unique_ptr closes session
    }
    initialized_ = false;
    LOG_INFO("Database connection pool shut down.");
}
```cpp
#include "Database.h"

Database::Database() {
    conn_string_ = "host=" + Config::getDbHost() +
                   " port=" + std::to_string(Config::getDbPort()) +
                   " user=" + Config::getDbUser() +
                   " password=" + Config::getDbPassword() +
                   " dbname=" + Config::getDbName();
    Logger::debug("Database connection string initialized: {}", conn_string_);
}

Database::~Database() {
    disconnect();
}

void Database::connect() {
    if (conn_ && conn_->is_open()) {
        Logger::info("Database connection already open.");
        return;
    }
    Logger::info("Attempting to connect to database: {} on port {}", Config::getDbHost(), Config::getDbPort());
    try {
        conn_ = std::make_unique<pqxx::connection>(conn_string_);
        if (conn_->is_open()) {
            Logger::info("Database connection established successfully.");
        } else {
            Logger::error("Failed to establish database connection.");
            throw pqxx::broken_connection("Failed to establish database connection.");
        }
    } catch (const pqxx::broken_connection& e) {
        Logger::error("Database connection error: {}", e.what());
        throw; // Re-throw for handling in main
    }
}

void Database::disconnect() {
    if (conn_ && conn_->is_open()) {
        conn_->disconnect();
        Logger::info("Database disconnected.");
    }
}

std::unique_ptr<pqxx::work> Database::getTransaction() {
    if (!conn_ || !conn_->is_open()) {
        Logger::error("Attempted to get transaction from closed or invalid connection.");
        throw pqxx::broken_connection("Database connection is not open.");
    }
    // Using a new work object for each transaction is standard pqxx practice.
    // It automatically commits on destruction if no error, or rolls back.
    return std::make_unique<pqxx::work>(*conn_);
}

pqxx::connection& Database::getConnection() {
    if (!conn_ || !conn_->is_open()) {
        Logger::error("Attempted to get connection from closed or invalid connection.");
        throw pqxx::broken_connection("Database connection is not open.");
    }
    return *conn_;
}
```
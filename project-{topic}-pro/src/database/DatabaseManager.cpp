```cpp
#include "database/DatabaseManager.hpp"
#include "util/Logger.hpp"
#include <stdexcept>
#include <format> // C++20 for std::format

std::string DatabaseManager::connectionString;
bool DatabaseManager::isInitialized = false;

void DatabaseManager::init(const std::string& host, int port, const std::string& dbname,
                           const std::string& user, const std::string& password) {
    if (isInitialized) {
        Logger::get()->warn("DatabaseManager already initialized.");
        return;
    }
    connectionString = std::format("host={} port={} dbname={} user={} password={}",
                                   host, port, dbname, user, password);
    isInitialized = true;
    Logger::get()->info("DatabaseManager initialized with connection string details (password hidden).");

    // Test connection
    try {
        auto conn = getConnection();
        Logger::get()->info("Successfully connected to database: {}", dbname);
    } catch (const pqxx::broken_connection& e) {
        Logger::get()->critical("Initial database connection failed: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::get()->critical("Error testing database connection: {}", e.what());
        throw;
    }
}

std::unique_ptr<pqxx::connection> DatabaseManager::getConnection() {
    if (!isInitialized) {
        throw std::runtime_error("DatabaseManager not initialized. Call init() first.");
    }
    try {
        return std::make_unique<pqxx::connection>(connectionString);
    } catch (const pqxx::broken_connection& e) {
        Logger::get()->error("Database connection failed: {}", e.what());
        throw;
    } catch (const std::exception& e) {
        Logger::get()->error("Error getting database connection: {}", e.what());
        throw;
    }
}

void DatabaseManager::close() {
    // libpqxx connections are managed per request/thread, no global connection to close.
    // This function serves as a placeholder if a connection pool were implemented.
    Logger::get()->info("DatabaseManager close called. No global connections to close with current setup.");
    isInitialized = false;
}
```
```cpp
#include "Database.h"

namespace VisuFlow {
namespace Data {
namespace DB {

std::unique_ptr<Database> Database::s_instance = nullptr;
bool Database::s_isInitialized = false;

Database::Database(const std::string& connInfo) : m_connInfo(connInfo) {}

void Database::init(const std::string& host, const std::string& port,
                    const std::string& dbname, const std::string& user,
                    const std::string& password) {
    if (s_isInitialized) {
        VisuFlow::Util::Logger::log(spdlog::level::warn, "Database already initialized. Re-initializing.");
    }

    std::string connInfo = "host=" + host +
                           " port=" + port +
                           " dbname=" + dbname +
                           " user=" + user +
                           " password=" + password;

    try {
        // Test connection immediately
        pqxx::connection testConn(connInfo);
        testConn.disconnect(); // Close test connection
        VisuFlow::Util::Logger::log(spdlog::level::info, "Test database connection successful for: {}", dbname);

        s_instance = std::unique_ptr<Database>(new Database(connInfo));
        s_isInitialized = true;
        VisuFlow::Util::Logger::log(spdlog::level::info, "Database connection manager initialized.");
    } catch (const pqxx::broken_connection& e) {
        VisuFlow::Util::Logger::log(spdlog::level::critical, "Database connection failed (broken_connection): {}", e.what());
        throw std::runtime_error(std::string("Database connection failed: ") + e.what());
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::critical, "Database connection failed (sql_error): {}", e.what());
        throw std::runtime_error(std::string("Database connection failed: ") + e.what());
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::critical, "Database connection failed (generic error): {}", e.what());
        throw std::runtime_error(std::string("Database connection failed: ") + e.what());
    }
}

Database& Database::getInstance() {
    if (!s_isInitialized || !s_instance) {
        throw std::runtime_error("Database not initialized. Call Database::init() first.");
    }
    return *s_instance;
}

std::unique_ptr<pqxx::connection> Database::getConnection() {
    if (!s_isInitialized) {
        throw std::runtime_error("Database not initialized. Cannot get a connection.");
    }
    try {
        return std::make_unique<pqxx::connection>(m_connInfo);
    } catch (const pqxx::pqxx_exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Failed to get database connection from pool: {}", e.what());
        throw std::runtime_error(std::string("Failed to get database connection: ") + e.what());
    }
}

} // namespace DB
} // namespace Data
} // namespace VisuFlow
```
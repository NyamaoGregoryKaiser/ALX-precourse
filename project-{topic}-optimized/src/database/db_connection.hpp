#ifndef CMS_DB_CONNECTION_HPP
#define CMS_DB_CONNECTION_HPP

#include <pqxx/pqxx>
#include <string>
#include <memory>
#include <stdexcept>
#include <mutex>
#include "../common/config.hpp"
#include "../common/logger.hpp"

namespace cms::database {

class DBConnection {
public:
    // Get the singleton instance
    static DBConnection& get_instance() {
        static DBConnection instance;
        return instance;
    }

    // Get a new connection from the pool/manager
    std::unique_ptr<pqxx::connection> get_connection() {
        // For simplicity, we create a new connection each time.
        // In a real high-load application, a connection pool would be implemented here.
        try {
            const auto& config = cms::common::AppConfig::get_instance();
            std::string conn_str = "host=" + config.db_host +
                                   " port=" + std::to_string(config.db_port) +
                                   " user=" + config.db_user +
                                   " password=" + config.db_password +
                                   " dbname=" + config.db_name;
            LOG_DEBUG("Attempting to connect to database: {}", conn_str);
            return std::make_unique<pqxx::connection>(conn_str);
        } catch (const pqxx::broken_connection& e) {
            LOG_CRITICAL("Database connection broken: {}", e.what());
            throw;
        } catch (const pqxx::usage_error& e) {
            LOG_CRITICAL("Database usage error: {}", e.what());
            throw;
        } catch (const std::exception& e) {
            LOG_CRITICAL("Failed to get database connection: {}", e.what());
            throw;
        }
    }

private:
    DBConnection() = default; // Private constructor for singleton
    ~DBConnection() = default;

    // Delete copy constructor and assignment operator
    DBConnection(const DBConnection&) = delete;
    DBConnection& operator=(const DBConnection&) = delete;
};

} // namespace cms::database

#endif // CMS_DB_CONNECTION_HPP
```
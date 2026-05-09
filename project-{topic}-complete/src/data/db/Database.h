```cpp
#ifndef VISUFLOW_DATABASE_H
#define VISUFLOW_DATABASE_H

#include "util/Logger.h"

#include <string>
#include <memory>
#include <pqxx/pqxx> // For PostgreSQL interaction

namespace VisuFlow {
namespace Data {
namespace DB {

/**
 * @brief Manages the application's single PostgreSQL database connection.
 * Implements a Singleton pattern to ensure a single database connection pool.
 */
class Database {
public:
    // Delete copy constructor and assignment operator for Singleton
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    /**
     * @brief Initializes the database connection pool.
     * Must be called once before `getInstance()`.
     * @param host Database host.
     * @param port Database port.
     * @param dbname Database name.
     * @param user Username.
     * @param password Password.
     * @throws std::runtime_error if connection fails.
     */
    static void init(const std::string& host, const std::string& port,
                     const std::string& dbname, const std::string& user,
                     const std::string& password);

    /**
     * @brief Gets the singleton instance of the Database.
     * @return Reference to the Database instance.
     * @throws std::runtime_error if database is not initialized yet.
     */
    static Database& getInstance();

    /**
     * @brief Gets a connection from the pool.
     * @return A unique_ptr to a pqxx::connection object.
     */
    std::unique_ptr<pqxx::connection> getConnection();

private:
    Database(const std::string& connInfo); // Private constructor for Singleton

    static std::unique_ptr<Database> s_instance;
    static bool s_isInitialized;
    std::string m_connInfo;
    // In a real application, you might use a connection pool here
    // For simplicity, we'll just store connection info and create a new connection per request.
};

} // namespace DB
} // namespace Data
} // namespace VisuFlow

#endif // VISUFLOW_DATABASE_H
```
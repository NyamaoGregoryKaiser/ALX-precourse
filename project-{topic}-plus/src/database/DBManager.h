#ifndef DB_MANAGER_H
#define DB_MANAGER_H

#include <string>
#include <memory>
#include <pqxx/pqxx> // PostgreSQL C++ client
#include <vector>
#include <mutex>
#include <condition_variable>
#include <queue>
#include "../config/AppConfig.h"

// Custom exception for database operations
class DatabaseException : public std::runtime_error {
public:
    explicit DatabaseException(const std::string& message) : std::runtime_error(message) {}
};

class DBManager {
public:
    static DBManager& get_instance(); // Singleton accessor
    ~DBManager();

    // Get a connection from the pool (blocks if none available)
    std::shared_ptr<pqxx::connection> getConnection();
    // Return a connection to the pool
    void returnConnection(std::shared_ptr<pqxx::connection> conn);

    // Execute a non-query command (INSERT, UPDATE, DELETE)
    void executeCommand(const std::string& sql);

    // Execute a query and return results
    pqxx::result executeQuery(const std::string& sql);
    pqxx::result executeParameterizedQuery(const std::string& sql, const std::vector<std::string>& params);
    
    // Begin a transaction (returns a transaction object)
    std::unique_ptr<pqxx::work> beginTransaction();

private:
    DBManager(); // Private constructor for singleton
    DBManager(const DBManager&) = delete; // Delete copy constructor
    DBManager& operator=(const DBManager&) = delete; // Delete assignment operator

    void init_pool(); // Initialize the connection pool
    std::string get_connection_string() const; // Build the connection string

    std::queue<std::shared_ptr<pqxx::connection>> _connection_pool;
    std::mutex _pool_mutex;
    std::condition_variable _pool_cond;
    int _max_pool_size;
    int _current_connections;
    const AppConfig& _config;
};

#endif // DB_MANAGER_H
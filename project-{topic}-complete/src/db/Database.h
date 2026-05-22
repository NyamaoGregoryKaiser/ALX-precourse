```cpp
#pragma once

#include <pqxx/pqxx>
#include <string>
#include <memory>
#include <vector>
#include <mutex>
#include <queue>
#include <stdexcept>

// Forward declaration for database connection pool
class DbConnectionPool;

class Database {
public:
    // Initialize the connection pool. Must be called once at startup.
    static void initPool(const std::string& host, const std::string& user,
                         const std::string& password, const std::string& dbname,
                         int port, size_t poolSize = 10);

    // Get a connection from the pool.
    static std::shared_ptr<pqxx::connection> getConnection();

    // Release a connection back to the pool.
    static void releaseConnection(std::shared_ptr<pqxx::connection> conn);

    // Shutdown the connection pool. Must be called once at shutdown.
    static void shutdownPool();

    // Run database migration scripts
    static void runMigrations(const std::string& migrationsPath);

    // Helper for executing a query and returning results
    static std::vector<pqxx::row> executeQuery(const std::string& sql,
                                               const std::vector<std::string>& params = {});

    // Helper for executing a command (INSERT, UPDATE, DELETE)
    static int executeCommand(const std::string& sql,
                              const std::vector<std::string>& params = {});

private:
    static std::unique_ptr<DbConnectionPool> s_pool;
};

// Custom exception for database operations
class DbException : public std::runtime_error {
public:
    explicit DbException(const std::string& message)
        : std::runtime_error("Database Error: " + message) {}
};

class DbConnectionPool {
public:
    DbConnectionPool(const std::string& connString, size_t poolSize);
    ~DbConnectionPool();

    std::shared_ptr<pqxx::connection> getConnection();
    void releaseConnection(std::shared_ptr<pqxx::connection> conn);
    void closeAllConnections();

private:
    std::string _connString;
    size_t _poolSize;
    std::queue<std::shared_ptr<pqxx::connection>> _connections;
    std::mutex _mutex;
    std::condition_variable _condition;

    std::shared_ptr<pqxx::connection> createConnection();
    void expandPoolIfNeeded();
};
```
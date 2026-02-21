```cpp
#ifndef DBCONNECTION_H
#define DBCONNECTION_H

#include <pqxx/pqxx>
#include <string>
#include <vector>
#include <memory>
#include <mutex>
#include <stdexcept>
#include <functional>
#include <queue>
#include <condition_variable>

#include "../utils/Logger.h"

// Implements a simple connection pool for pqxx
class DbConnection {
public:
    static void init_pool(const std::string& host, int port, const std::string& dbname,
                          const std::string& user, const std::string& password, int pool_size);
    static std::shared_ptr<pqxx::connection> get_connection();
    static void release_connection(std::shared_ptr<pqxx::connection> conn);
    static void shutdown_pool();
    static void apply_migrations();
    static void seed_data();

private:
    static std::string conn_string;
    static std::vector<std::shared_ptr<pqxx::connection>> connection_pool;
    static std::mutex pool_mutex;
    static std::condition_variable condition;
    static bool pool_initialized;
    static bool shutting_down;
    static int max_pool_size;

    DbConnection() = delete; // Prevent instantiation
    DbConnection(const DbConnection&) = delete;
    DbConnection& operator=(const DbConnection&) = delete;

    static void create_connection_in_pool();
    static void execute_sql_file(pqxx::connection& conn, const std::string& filepath, const std::string& description);
};

#endif // DBCONNECTION_H

```
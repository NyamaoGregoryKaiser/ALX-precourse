```cpp
#ifndef PAYMENT_PROCESSOR_DATABASE_MANAGER_HPP
#define PAYMENT_PROCESSOR_DATABASE_MANAGER_HPP

#include <string>
#include <memory>
#include <pqxx/pqxx> // For PostgreSQL client library

class DatabaseManager {
public:
    static void init(const std::string& host, int port, const std::string& dbname,
                     const std::string& user, const std::string& password);
    static std::unique_ptr<pqxx::connection> getConnection();
    static void close();

private:
    static std::string connectionString;
    static bool isInitialized;
};

#endif // PAYMENT_PROCESSOR_DATABASE_MANAGER_HPP
```
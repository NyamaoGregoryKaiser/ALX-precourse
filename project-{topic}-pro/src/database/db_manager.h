```cpp
#ifndef WEBSCRAPER_DB_MANAGER_H
#define WEBSCRAPER_DB_MANAGER_H

#include <pqxx/pqxx>
#include <string>
#include <memory>
#include <vector>
#include <mutex>

class DatabaseManager {
public:
    static DatabaseManager& getInstance();
    DatabaseManager(const DatabaseManager&) = delete;
    DatabaseManager& operator=(const DatabaseManager&) = delete;

    std::shared_ptr<pqxx::connection> getConnection();
    void releaseConnection(std::shared_ptr<pqxx::connection> conn);

private:
    DatabaseManager();
    ~DatabaseManager();

    std::string connInfo;
    std::vector<std::shared_ptr<pqxx::connection>> connectionPool;
    std::mutex poolMutex;
    const size_t MAX_CONNECTIONS = 10; // Pool size

    void createConnection();
    static std::shared_ptr<pqxx::connection> createAndConnect(const std::string& connInfo);
};

#endif // WEBSCRAPER_DB_MANAGER_H
```
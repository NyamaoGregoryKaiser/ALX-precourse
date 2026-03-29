```cpp
#ifndef DATAVIZ_DATABASE_H
#define DATAVIZ_DATABASE_H

#include <pqxx/pqxx>
#include <string>
#include <memory>
#include "../config/Config.h"
#include "../utils/Logger.h"

// Database connection manager
class Database {
private:
    std::string conn_string_;
    std::unique_ptr<pqxx::connection> conn_; // Using unique_ptr for connection

public:
    Database();
    ~Database();

    void connect();
    void disconnect();

    // Provides a new transaction object (smart pointer for RAII)
    std::unique_ptr<pqxx::work> getTransaction();

    // Get the current connection (for direct use if needed, e.g., for `prepare`)
    pqxx::connection& getConnection();
};

#endif // DATAVIZ_DATABASE_H
```
```cpp
#ifndef VISGENIUS_DATABASE_H
#define VISGENIUS_DATABASE_H

#include <string>
#include <vector>
#include <memory>
#include <sqlite3.h> // SQLite C API

#include "Models.h"
#include "ErrorHandling.h"
#include "Logger.h"

namespace VisGenius {

class Database {
public:
    explicit Database(const std::string& db_path);
    ~Database();

    // Prevent copy/move
    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;
    Database(Database&&) = delete;
    Database& operator=(Database&&) = delete;

    void initialize();
    bool execute(const std::string& sql);

    // --- CRUD for Data Sources ---
    int createDataSource(const DataSource& ds);
    std::unique_ptr<DataSource> getDataSource(int id);
    std::vector<DataSource> getAllDataSources();
    bool updateDataSource(const DataSource& ds);
    bool deleteDataSource(int id);

    // --- CRUD for Visualizations ---
    int createVisualization(const Visualization& viz);
    std::unique_ptr<Visualization> getVisualization(int id);
    std::vector<Visualization> getAllVisualizations();
    bool updateVisualization(const Visualization& viz);
    bool deleteVisualization(int id);

    // --- CRUD for Dashboards ---
    int createDashboard(const Dashboard& dash);
    std::unique_ptr<Dashboard> getDashboard(int id);
    std::vector<Dashboard> getAllDashboards();
    bool updateDashboard(const Dashboard& dash);
    bool deleteDashboard(int id);

    // --- CRUD for Users ---
    int createUser(const User& user);
    std::unique_ptr<User> getUser(int id);
    std::unique_ptr<User> getUserByUsername(const std::string& username);
    std::vector<User> getAllUsers();
    bool updateUser(const User& user);
    bool deleteUser(int id);


private:
    sqlite3* m_db;
    std::string m_db_path;

    // Helper for preparing statements and handling errors
    int prepareStatement(const std::string& sql, sqlite3_stmt** stmt);
    // Helper for common SELECT operations
    template<typename T>
    std::vector<T> query(const std::string& sql, T(*row_mapper)(sqlite3_stmt*));
    // Overload for query with parameters
    template<typename T, typename... Args>
    std::vector<T> query(const std::string& sql, T(*row_mapper)(sqlite3_stmt*), Args... args);
};

// --- Row Mappers for Models ---
DataSource mapToDataSource(sqlite3_stmt* stmt);
Visualization mapToVisualization(sqlite3_stmt* stmt);
Dashboard mapToDashboard(sqlite3_stmt* stmt);
User mapToUser(sqlite3_stmt* stmt);


} // namespace VisGenius

#endif // VISGENIUS_DATABASE_H
```
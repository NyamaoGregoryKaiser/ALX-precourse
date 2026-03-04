#pragma once

#include "models/User.h"
#include "models/DataSource.h"
#include "models/Visualization.h"
#include "models/Dashboard.h"
#include "utils/Logger.h"
#include <pqxx/pqxx>
#include <string>
#include <vector>
#include <memory> // For std::unique_ptr

// A simple UUID generator (for demonstration)
class UUID {
public:
    static std::string generate();
};

class DBManager {
public:
    DBManager(const std::string& connection_string);
    ~DBManager();

    void connect();
    void disconnect();
    void initializeSchema(); // Apply migrations

    // User operations
    void createUser(const User& user);
    User findUserByEmail(const std::string& email);
    User findUserById(const std::string& id);

    // Data Source operations
    void createDataSource(const DataSource& ds);
    DataSource findDataSourceById(const std::string& id);
    std::vector<DataSource> findDataSourcesByUserId(const std::string& user_id);
    void updateDataSource(const DataSource& ds);
    void deleteDataSource(const std::string& id);

    // Visualization operations
    void createVisualization(const Visualization& viz);
    Visualization findVisualizationById(const std::string& id);
    std::vector<Visualization> findVisualizationsByUserId(const std::string& user_id);
    void updateVisualization(const Visualization& viz);
    void deleteVisualization(const std::string& id);

    // Dashboard operations
    void createDashboard(const Dashboard& dash);
    Dashboard findDashboardById(const std::string& id);
    std::vector<Dashboard> findDashboardsByUserId(const std::string& user_id);
    void updateDashboard(const Dashboard& dash);
    void deleteDashboard(const std::string& id);

private:
    std::string connection_string_;
    std::unique_ptr<pqxx::connection> conn_;

    // Helper to safely get optional values from pqxx::row
    template<typename T>
    T get_optional(const pqxx::row& r, const std::string& column_name, T default_value) {
        if (r[column_name].is_null()) {
            return default_value;
        }
        return r[column_name].as<T>();
    }
};
```cpp
#ifndef VISUFLOW_DASHBOARD_REPOSITORY_H
#define VISUFLOW_DASHBOARD_REPOSITORY_H

#include "data/model/DataModels.h"
#include "data/db/Database.h"
#include "util/Logger.h"
#include "util/ErrorHandler.h"

#include <string>
#include <vector>
#include <memory>
#include <pqxx/pqxx>

namespace VisuFlow {
namespace Data {
namespace DB {

/**
 * @brief Repository for managing Dashboard data in the database.
 * Provides CRUD-like operations for Dashboard models.
 */
class DashboardRepository {
public:
    DashboardRepository();

    /**
     * @brief Finds a dashboard by its ID.
     * @param dashboardId The ID of the dashboard.
     * @return Dashboard object if found, otherwise an uninitialized Dashboard (id=0).
     */
    Model::Dashboard findById(long long dashboardId);

    /**
     * @brief Finds all dashboards owned by a specific user.
     * @param userId The ID of the user.
     * @return A vector of Dashboard objects.
     */
    std::vector<Model::Dashboard> findByUserId(long long userId);

    /**
     * @brief Creates a new dashboard in the database.
     * @param name Name of the dashboard.
     * @param description Description of the dashboard.
     * @param layoutJson JSON string defining the dashboard layout.
     * @param userId The ID of the owner user.
     * @return The created Dashboard object with its assigned ID.
     */
    Model::Dashboard create(const std::string& name, const std::string& description,
                           const std::string& layoutJson, long long userId);

    /**
     * @brief Updates an existing dashboard's information.
     * @param id The ID of the dashboard to update.
     * @param name The new name (optional, can be empty to keep current).
     * @param description The new description (optional).
     * @param layoutJson The new layout JSON (optional).
     * @param userId The user ID for authorization check.
     * @return The updated Dashboard object.
     * @throws Util::APIException if dashboard not found or update fails.
     */
    Model::Dashboard update(long long id,
                           const std::string& name,
                           const std::string& description,
                           const std::string& layoutJson,
                           long long userId); // userId for authorization/ownership check

    /**
     * @brief Deletes a dashboard from the database.
     * @param dashboardId The ID of the dashboard to delete.
     * @throws Util::APIException if dashboard not found or deletion fails.
     */
    void remove(long long dashboardId);

private:
    // Helper to map pqxx::row to Model::Dashboard
    Model::Dashboard mapRowToDashboard(const pqxx::row& row);
};

} // namespace DB
} // namespace Data
} // namespace VisuFlow

#endif // VISUFLOW_DASHBOARD_REPOSITORY_H
```
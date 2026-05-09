```cpp
#include "DashboardRepository.h"
#include "core/common/Utils.h" // For get_current_timestamp

namespace VisuFlow {
namespace Data {
namespace DB {

DashboardRepository::DashboardRepository() {
    VisuFlow::Util::Logger::log(spdlog::level::debug, "DashboardRepository initialized.");
}

Model::Dashboard DashboardRepository::findById(long long dashboardId) {
    Model::Dashboard dashboard;
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        pqxx::result r = txn.exec_params(
            "SELECT id, name, description, layout_json, user_id, created_at, updated_at FROM dashboards WHERE id = $1",
            dashboardId
        );

        if (!r.empty()) {
            dashboard = mapRowToDashboard(r[0]);
        }
        txn.commit();
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error in findById: {}", e.what());
        throw Util::APIException("Database error finding dashboard by ID.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error in findById: {}", e.what());
        throw Util::APIException("Internal server error finding dashboard by ID.", 500);
    }
    return dashboard;
}

std::vector<Model::Dashboard> DashboardRepository::findByUserId(long long userId) {
    std::vector<Model::Dashboard> dashboards;
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        pqxx::result r = txn.exec_params(
            "SELECT id, name, description, layout_json, user_id, created_at, updated_at FROM dashboards WHERE user_id = $1 ORDER BY name",
            userId
        );

        for (const auto& row : r) {
            dashboards.push_back(mapRowToDashboard(row));
        }
        txn.commit();
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error in findByUserId: {}", e.what());
        throw Util::APIException("Database error finding dashboards by user ID.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error in findByUserId: {}", e.what());
        throw Util::APIException("Internal server error finding dashboards by user ID.", 500);
    }
    return dashboards;
}

Model::Dashboard DashboardRepository::create(const std::string& name, const std::string& description,
                                           const std::string& layoutJson, long long userId) {
    Model::Dashboard newDashboard;
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        std::string currentTime = Core::Common::Utils::get_current_timestamp();
        pqxx::result r = txn.exec_params(
            "INSERT INTO dashboards (name, description, layout_json, user_id, created_at, updated_at) "
            "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            name, description, layoutJson, userId, currentTime, currentTime
        );
        txn.commit();

        if (!r.empty()) {
            newDashboard.id = r[0]["id"].as<long long>();
            newDashboard.name = name;
            newDashboard.description = description;
            newDashboard.layoutJson = layoutJson;
            newDashboard.userId = userId;
            newDashboard.createdAt = currentTime;
            newDashboard.updatedAt = currentTime;
        }
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error creating dashboard: {}", e.what());
        throw Util::APIException("Database error creating dashboard.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error creating dashboard: {}", e.what());
        throw Util::APIException("Internal server error creating dashboard.", 500);
    }
    return newDashboard;
}

Model::Dashboard DashboardRepository::update(long long id,
                                           const std::string& name,
                                           const std::string& description,
                                           const std::string& layoutJson,
                                           long long userId) {
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        std::string currentTime = Core::Common::Utils::get_current_timestamp();

        // Ensure user owns the dashboard before updating
        pqxx::result checkOwner = txn.exec_params("SELECT user_id FROM dashboards WHERE id = $1", id);
        if (checkOwner.empty() || checkOwner[0]["user_id"].as<long long>() != userId) {
            throw Util::APIException("Dashboard not found or unauthorized to update.", 404);
        }

        pqxx::result r = txn.exec_params(
            "UPDATE dashboards SET name = $1, description = $2, layout_json = $3, updated_at = $4 WHERE id = $5 RETURNING *",
            name, description, layoutJson, currentTime, id
        );
        txn.commit();

        if (r.empty()) {
            throw Util::APIException("Dashboard not found for update.", 404);
        }
        return mapRowToDashboard(r[0]);
    } catch (const Util::APIException&) {
        throw; // Re-throw caught APIExceptions
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error updating dashboard: {}", e.what());
        throw Util::APIException("Database error updating dashboard.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error updating dashboard: {}", e.what());
        throw Util::APIException("Internal server error updating dashboard.", 500);
    }
}

void DashboardRepository::remove(long long dashboardId) {
    try (std::unique_ptr<pqxx::connection> conn = Database::getInstance().getConnection()) {
        pqxx::work txn(*conn);
        pqxx::result r = txn.exec_params("DELETE FROM dashboards WHERE id = $1 RETURNING id", dashboardId);
        txn.commit();

        if (r.empty()) {
            throw Util::APIException("Dashboard not found for deletion.", 404);
        }
    } catch (const pqxx::sql_error& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "SQL Error deleting dashboard: {}", e.what());
        throw Util::APIException("Database error deleting dashboard.", 500);
    } catch (const std::exception& e) {
        VisuFlow::Util::Logger::log(spdlog::level::error, "Error deleting dashboard: {}", e.what());
        throw Util::APIException("Internal server error deleting dashboard.", 500);
    }
}

Model::Dashboard DashboardRepository::mapRowToDashboard(const pqxx::row& row) {
    Model::Dashboard dashboard;
    dashboard.id = row["id"].as<long long>();
    dashboard.name = row["name"].as<std::string>();
    dashboard.description = row["description"].as<std::string>();
    dashboard.layoutJson = row["layout_json"].as<std::string>();
    dashboard.userId = row["user_id"].as<long long>();
    dashboard.createdAt = row["created_at"].as<std::string>();
    dashboard.updatedAt = row["updated_at"].as<std::string>();
    return dashboard;
}

} // namespace DB
} // namespace Data
} // namespace VisuFlow
```
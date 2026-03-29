```cpp
#include "VisualizationRepository.h"
#include <nlohmann/json.hpp>

VisualizationRepository::VisualizationRepository(std::shared_ptr<Database> db) : db_(std::move(db)) {
    try {
        if (!db_->getConnection().is_prepared("insert_visualization")) {
            db_->getConnection().prepare(
                "insert_visualization",
                "INSERT INTO visualizations (user_id, dataset_id, name, description, chart_type, config) "
                "VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING id, created_at, updated_at"
            );
        }
        if (!db_->getConnection().is_prepared("select_visualization_by_id")) {
            db_->getConnection().prepare(
                "select_visualization_by_id",
                "SELECT id, user_id, dataset_id, name, description, chart_type, config, created_at, updated_at FROM visualizations WHERE id = $1"
            );
        }
        if (!db_->getConnection().is_prepared("select_visualizations_by_user_id")) {
            db_->getConnection().prepare(
                "select_visualizations_by_user_id",
                "SELECT id, user_id, dataset_id, name, description, chart_type, config, created_at, updated_at FROM visualizations WHERE user_id = $1"
            );
        }
         if (!db_->getConnection().is_prepared("select_visualizations_by_dataset_id")) {
            db_->getConnection().prepare(
                "select_visualizations_by_dataset_id",
                "SELECT id, user_id, dataset_id, name, description, chart_type, config, created_at, updated_at FROM visualizations WHERE dataset_id = $1"
            );
        }
        if (!db_->getConnection().is_prepared("select_all_visualizations")) {
            db_->getConnection().prepare(
                "select_all_visualizations",
                "SELECT id, user_id, dataset_id, name, description, chart_type, config, created_at, updated_at FROM visualizations"
            );
        }
        if (!db_->getConnection().is_prepared("update_visualization")) {
            db_->getConnection().prepare(
                "update_visualization",
                "UPDATE visualizations SET user_id = $1, dataset_id = $2, name = $3, description = $4, chart_type = $5, config = $6::jsonb, updated_at = NOW() WHERE id = $7"
            );
        }
        if (!db_->getConnection().is_prepared("delete_visualization")) {
            db_->getConnection().prepare(
                "delete_visualization",
                "DELETE FROM visualizations WHERE id = $1"
            );
        }
        Logger::debug("Visualization repository prepared statements.");
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error preparing visualization statements: {}", e.what());
    }
}

std::optional<Visualization> VisualizationRepository::create(Visualization& visualization) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared(
            "insert_visualization",
            visualization.getUserId(), visualization.getDatasetId(), visualization.getName(),
            visualization.getDescription(), visualization.getChartType(), visualization.getConfig().dump()
        );
        trans->commit();

        if (!r.empty()) {
            visualization.setId(r[0]["id"].as<int>());
            visualization.setCreatedAt(r[0]["created_at"].as<std::string>());
            visualization.setUpdatedAt(r[0]["updated_at"].as<std::string>());
            Logger::info("Visualization created with ID: {}", *visualization.getId());
            return visualization;
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error creating visualization: {}", e.what());
    } catch (const std::exception& e) {
        Logger::error("Error creating visualization: {}", e.what());
    }
    return std::nullopt;
}

std::optional<Visualization> VisualizationRepository::findById(int id) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_visualization_by_id", id);
        trans->commit();

        if (!r.empty()) {
            return visualizationFromRow(r[0]);
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding visualization by ID {}: {}", id, e.what());
    }
    return std::nullopt;
}

std::vector<Visualization> VisualizationRepository::findByUserId(int user_id) {
    std::vector<Visualization> visualizations;
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_visualizations_by_user_id", user_id);
        trans->commit();

        for (const auto& row : r) {
            visualizations.push_back(visualizationFromRow(row));
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding visualizations by user ID {}: {}", user_id, e.what());
    }
    return visualizations;
}

std::vector<Visualization> VisualizationRepository::findByDatasetId(int dataset_id) {
    std::vector<Visualization> visualizations;
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_visualizations_by_dataset_id", dataset_id);
        trans->commit();

        for (const auto& row : r) {
            visualizations.push_back(visualizationFromRow(row));
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding visualizations by dataset ID {}: {}", dataset_id, e.what());
    }
    return visualizations;
}

std::vector<Visualization> VisualizationRepository::findAll() {
    std::vector<Visualization> visualizations;
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_all_visualizations");
        trans->commit();

        for (const auto& row : r) {
            visualizations.push_back(visualizationFromRow(row));
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding all visualizations: {}", e.what());
    }
    return visualizations;
}

bool VisualizationRepository::update(const Visualization& visualization) {
    if (!visualization.getId()) {
        Logger::error("Cannot update visualization without an ID.");
        return false;
    }
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared(
            "update_visualization",
            visualization.getUserId(), visualization.getDatasetId(), visualization.getName(),
            visualization.getDescription(), visualization.getChartType(),
            visualization.getConfig().dump(), *visualization.getId()
        );
        trans->commit();
        Logger::info("Visualization with ID {} updated.", *visualization.getId());
        return r.affected_rows() == 1;
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error updating visualization {}: {}", *visualization.getId(), e.what());
    }
    return false;
}

bool VisualizationRepository::remove(int id) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("delete_visualization", id);
        trans->commit();
        Logger::info("Visualization with ID {} deleted.", id);
        return r.affected_rows() == 1;
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error deleting visualization {}: {}", id, e.what());
    }
    return false;
}

Visualization VisualizationRepository::visualizationFromRow(const pqxx::row& row) {
    Visualization visualization(
        row["id"].as<int>(),
        row["user_id"].as<int>(),
        row["dataset_id"].as<int>(),
        row["name"].as<std::string>(),
        row["description"].as<std::string>(),
        row["chart_type"].as<std::string>(),
        nlohmann::json::parse(row["config"].as<std::string>()), // Parse JSONB config
        row["created_at"].as<std::string>(),
        row["updated_at"].as<std::string>()
    );
    return visualization;
}
```
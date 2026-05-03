```cpp
#include "DBManager.hpp"
#include <iostream>
#include <fstream>
#include <sstream>

namespace MLToolkit {
namespace Database {

DBManager& DBManager::get_instance() {
    static DBManager instance;
    return instance;
}

void DBManager::connect(const std::string& conn_str) {
    if (conn_ && conn_->is_open()) {
        LOG_WARN("Already connected to database.");
        return;
    }
    try {
        conn_ = std::make_unique<pqxx::connection>(conn_str);
        if (conn_->is_open()) {
            LOG_INFO("Successfully connected to database: {}", conn_->dbname());
            connection_string_ = conn_str;
        } else {
            LOG_CRITICAL("Failed to connect to database using connection string: {}", conn_str);
            throw Common::DatabaseException("Failed to connect to database.");
        }
    } catch (const pqxx::broken_connection& e) {
        LOG_CRITICAL("Database connection broken: {}", e.what());
        conn_.reset(); // Ensure connection is reset
        throw Common::DatabaseException(std::string("Database connection broken: ") + e.what());
    } catch (const std::exception& e) {
        LOG_CRITICAL("Database connection error: {}", e.what());
        conn_.reset(); // Ensure connection is reset
        throw Common::DatabaseException(std::string("Database connection error: ") + e.what());
    }
}

void DBManager::disconnect() {
    if (conn_ && conn_->is_open()) {
        conn_->disconnect();
        LOG_INFO("Disconnected from database.");
    }
    conn_.reset();
}

void DBManager::ensure_connection() {
    if (!conn_ || !conn_->is_open()) {
        if (!connection_string_.empty()) {
            LOG_WARN("Database connection lost, attempting to reconnect.");
            connect(connection_string_); // Attempt to reconnect
        } else {
            throw Common::DatabaseException("No active database connection and no connection string provided for reconnect.");
        }
    }
}

void DBManager::run_migration(const std::string& migration_sql) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        W.exec(migration_sql);
        W.commit();
        LOG_INFO("Database migration successful.");
    } catch (const std::exception& e) {
        LOG_CRITICAL("Database migration failed: {}", e.what());
        throw Common::DatabaseException(std::string("Migration failed: ") + e.what());
    }
}

void DBManager::seed_data(const std::string& seed_sql) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        W.exec(seed_sql);
        W.commit();
        LOG_INFO("Database seed data successful.");
    } catch (const std::exception& e) {
        LOG_CRITICAL("Database seed data failed: {}", e.what());
        throw Common::DatabaseException(std::string("Seed data failed: ") + e.what());
    }
}

// --- Dataset CRUD ---
long DBManager::create_dataset(const Models::Dataset& dataset) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        const std::string sql =
            "INSERT INTO datasets (name, description, file_path, row_count, col_count, feature_names, metadata) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id;";
        pqxx::result R = W.exec_params(sql,
                                       dataset.name,
                                       dataset.description,
                                       dataset.file_path,
                                       dataset.row_count,
                                       dataset.col_count,
                                       pqxx::array_string<std::string>::generate(dataset.feature_names).c_str(),
                                       dataset.metadata.dump());
        W.commit();
        long id = R[0][0].as<long>();
        LOG_INFO("Created dataset with ID: {}", id);
        return id;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to create dataset: {}", e.what());
        throw Common::DatabaseException(std::string("Failed to create dataset: ") + e.what());
    }
}

std::optional<Models::Dataset> DBManager::get_dataset(long id) {
    ensure_connection();
    try {
        pqxx::nontransaction N(*conn_);
        pqxx::result R = N.exec_params("SELECT id, name, description, file_path, row_count, col_count, feature_names, created_at, updated_at, metadata FROM datasets WHERE id = $1;", id);
        if (R.empty()) {
            LOG_DEBUG("Dataset with ID {} not found.", id);
            return std::nullopt;
        }

        const auto& row = R[0];
        Models::Dataset ds;
        ds.id = row["id"].as<long>();
        ds.name = row["name"].as<std::string>();
        ds.description = row["description"].as<std::string>();
        ds.file_path = row["file_path"].as<std::string>();
        ds.row_count = row["row_count"].as<long>();
        ds.col_count = row["col_count"].as<long>();
        
        // Parse feature_names array
        std::string feature_names_str = row["feature_names"].as<std::string>();
        ds.feature_names = pqxx::array_parser::parse<std::string>(feature_names_str).get_values();

        ds.created_at = row["created_at"].as<time_t>();
        ds.updated_at = row["updated_at"].as<time_t>();
        ds.metadata = nlohmann::json::parse(row["metadata"].as<std::string>());
        
        LOG_DEBUG("Retrieved dataset with ID: {}", id);
        return ds;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to retrieve dataset with ID {}: {}", id, e.what());
        throw Common::DatabaseException(std::string("Failed to retrieve dataset: ") + e.what());
    }
}

std::vector<Models::Dataset> DBManager::get_all_datasets() {
    ensure_connection();
    std::vector<Models::Dataset> datasets;
    try {
        pqxx::nontransaction N(*conn_);
        pqxx::result R = N.exec("SELECT id, name, description, file_path, row_count, col_count, feature_names, created_at, updated_at, metadata FROM datasets ORDER BY id;");

        for (const auto& row : R) {
            Models::Dataset ds;
            ds.id = row["id"].as<long>();
            ds.name = row["name"].as<std::string>();
            ds.description = row["description"].as<std::string>();
            ds.file_path = row["file_path"].as<std::string>();
            ds.row_count = row["row_count"].as<long>();
            ds.col_count = row["col_count"].as<long>();
            ds.feature_names = pqxx::array_parser::parse<std::string>(row["feature_names"].as<std::string>()).get_values();
            ds.created_at = row["created_at"].as<time_t>();
            ds.updated_at = row["updated_at"].as<time_t>();
            ds.metadata = nlohmann::json::parse(row["metadata"].as<std::string>());
            datasets.push_back(ds);
        }
        LOG_DEBUG("Retrieved {} datasets.", datasets.size());
        return datasets;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to retrieve all datasets: {}", e.what());
        throw Common::DatabaseException(std::string("Failed to retrieve all datasets: ") + e.what());
    }
}

bool DBManager::update_dataset(const Models::Dataset& dataset) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        const std::string sql =
            "UPDATE datasets SET name = $1, description = $2, file_path = $3, row_count = $4, "
            "col_count = $5, feature_names = $6, updated_at = NOW(), metadata = $7 WHERE id = $8;";
        pqxx::result R = W.exec_params(sql,
                                       dataset.name,
                                       dataset.description,
                                       dataset.file_path,
                                       dataset.row_count,
                                       dataset.col_count,
                                       pqxx::array_string<std::string>::generate(dataset.feature_names).c_str(),
                                       dataset.metadata.dump(),
                                       dataset.id);
        W.commit();
        if (R.affected_rows() == 0) {
            LOG_WARN("Update failed: Dataset with ID {} not found.", dataset.id);
            return false;
        }
        LOG_INFO("Updated dataset with ID: {}", dataset.id);
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to update dataset with ID {}: {}", dataset.id, e.what());
        throw Common::DatabaseException(std::string("Failed to update dataset: ") + e.what());
    }
}

bool DBManager::delete_dataset(long id) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        pqxx::result R = W.exec_params("DELETE FROM datasets WHERE id = $1;", id);
        W.commit();
        if (R.affected_rows() == 0) {
            LOG_WARN("Delete failed: Dataset with ID {} not found.", id);
            return false;
        }
        LOG_INFO("Deleted dataset with ID: {}", id);
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to delete dataset with ID {}: {}", id, e.what());
        throw Common::DatabaseException(std::string("Failed to delete dataset: ") + e.what());
    }
}

// --- Model CRUD ---
long DBManager::create_model(const Models::Model& model) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        const std::string sql =
            "INSERT INTO models (name, description, type, artifact_path, dataset_id, metadata) "
            "VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;";
        pqxx::result R = W.exec_params(sql,
                                       model.name,
                                       model.description,
                                       Models::model_type_to_string(model.type),
                                       model.artifact_path,
                                       model.dataset_id,
                                       model.metadata.dump());
        W.commit();
        long id = R[0][0].as<long>();
        LOG_INFO("Created model with ID: {}", id);
        return id;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to create model: {}", e.what());
        throw Common::DatabaseException(std::string("Failed to create model: ") + e.what());
    }
}

std::optional<Models::Model> DBManager::get_model(long id) {
    ensure_connection();
    try {
        pqxx::nontransaction N(*conn_);
        pqxx::result R = N.exec_params("SELECT id, name, description, type, artifact_path, dataset_id, created_at, updated_at, metadata FROM models WHERE id = $1;", id);
        if (R.empty()) {
            LOG_DEBUG("Model with ID {} not found.", id);
            return std::nullopt;
        }

        const auto& row = R[0];
        Models::Model m;
        m.id = row["id"].as<long>();
        m.name = row["name"].as<std::string>();
        m.description = row["description"].as<std::string>();
        m.type = Models::string_to_model_type(row["type"].as<std::string>());
        m.artifact_path = row["artifact_path"].as<std::string>();
        m.dataset_id = row["dataset_id"].as<long>();
        m.created_at = row["created_at"].as<time_t>();
        m.updated_at = row["updated_at"].as<time_t>();
        m.metadata = nlohmann::json::parse(row["metadata"].as<std::string>());
        
        LOG_DEBUG("Retrieved model with ID: {}", id);
        return m;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to retrieve model with ID {}: {}", id, e.what());
        throw Common::DatabaseException(std::string("Failed to retrieve model: ") + e.what());
    }
}

std::vector<Models::Model> DBManager::get_all_models() {
    ensure_connection();
    std::vector<Models::Model> models;
    try {
        pqxx::nontransaction N(*conn_);
        pqxx::result R = N.exec("SELECT id, name, description, type, artifact_path, dataset_id, created_at, updated_at, metadata FROM models ORDER BY id;");

        for (const auto& row : R) {
            Models::Model m;
            m.id = row["id"].as<long>();
            m.name = row["name"].as<std::string>();
            m.description = row["description"].as<std::string>();
            m.type = Models::string_to_model_type(row["type"].as<std::string>());
            m.artifact_path = row["artifact_path"].as<std::string>();
            m.dataset_id = row["dataset_id"].as<long>();
            m.created_at = row["created_at"].as<time_t>();
            m.updated_at = row["updated_at"].as<time_t>();
            m.metadata = nlohmann::json::parse(row["metadata"].as<std::string>());
            models.push_back(m);
        }
        LOG_DEBUG("Retrieved {} models.", models.size());
        return models;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to retrieve all models: {}", e.what());
        throw Common::DatabaseException(std::string("Failed to retrieve all models: ") + e.what());
    }
}

bool DBManager::update_model(const Models::Model& model) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        const std::string sql =
            "UPDATE models SET name = $1, description = $2, type = $3, artifact_path = $4, "
            "dataset_id = $5, updated_at = NOW(), metadata = $6 WHERE id = $7;";
        pqxx::result R = W.exec_params(sql,
                                       model.name,
                                       model.description,
                                       Models::model_type_to_string(model.type),
                                       model.artifact_path,
                                       model.dataset_id,
                                       model.metadata.dump(),
                                       model.id);
        W.commit();
        if (R.affected_rows() == 0) {
            LOG_WARN("Update failed: Model with ID {} not found.", model.id);
            return false;
        }
        LOG_INFO("Updated model with ID: {}", model.id);
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to update model with ID {}: {}", model.id, e.what());
        throw Common::DatabaseException(std::string("Failed to update model: ") + e.what());
    }
}

bool DBManager::delete_model(long id) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        pqxx::result R = W.exec_params("DELETE FROM models WHERE id = $1;", id);
        W.commit();
        if (R.affected_rows() == 0) {
            LOG_WARN("Delete failed: Model with ID {} not found.", id);
            return false;
        }
        LOG_INFO("Deleted model with ID: {}", id);
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to delete model with ID {}: {}", id, e.what());
        throw Common::DatabaseException(std::string("Failed to delete model: ") + e.what());
    }
}

// --- Pipeline CRUD ---
long DBManager::create_pipeline(const Models::Pipeline& pipeline) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        nlohmann::json j_steps = nlohmann::json::array();
        for (const auto& step : pipeline.steps) {
            j_steps.push_back(step.to_json());
        }

        const std::string sql =
            "INSERT INTO pipelines (name, description, dataset_id, steps, metadata) "
            "VALUES ($1, $2, $3, $4, $5) RETURNING id;";
        pqxx::result R = W.exec_params(sql,
                                       pipeline.name,
                                       pipeline.description,
                                       pipeline.dataset_id,
                                       j_steps.dump(),
                                       pipeline.metadata.dump());
        W.commit();
        long id = R[0][0].as<long>();
        LOG_INFO("Created pipeline with ID: {}", id);
        return id;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to create pipeline: {}", e.what());
        throw Common::DatabaseException(std::string("Failed to create pipeline: ") + e.what());
    }
}

std::optional<Models::Pipeline> DBManager::get_pipeline(long id) {
    ensure_connection();
    try {
        pqxx::nontransaction N(*conn_);
        pqxx::result R = N.exec_params("SELECT id, name, description, dataset_id, steps, created_at, updated_at, metadata FROM pipelines WHERE id = $1;", id);
        if (R.empty()) {
            LOG_DEBUG("Pipeline with ID {} not found.", id);
            return std::nullopt;
        }

        const auto& row = R[0];
        Models::Pipeline p;
        p.id = row["id"].as<long>();
        p.name = row["name"].as<std::string>();
        p.description = row["description"].as<std::string>();
        p.dataset_id = row["dataset_id"].as<long>();
        
        nlohmann::json steps_json = nlohmann::json::parse(row["steps"].as<std::string>());
        if (steps_json.is_array()) {
            for (const auto& step_json : steps_json) {
                p.steps.push_back(Models::PipelineStep::from_json(step_json));
            }
        }

        p.created_at = row["created_at"].as<time_t>();
        p.updated_at = row["updated_at"].as<time_t>();
        p.metadata = nlohmann::json::parse(row["metadata"].as<std::string>());
        
        LOG_DEBUG("Retrieved pipeline with ID: {}", id);
        return p;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to retrieve pipeline with ID {}: {}", id, e.what());
        throw Common::DatabaseException(std::string("Failed to retrieve pipeline: ") + e.what());
    }
}

std::vector<Models::Pipeline> DBManager::get_all_pipelines() {
    ensure_connection();
    std::vector<Models::Pipeline> pipelines;
    try {
        pqxx::nontransaction N(*conn_);
        pqxx::result R = N.exec("SELECT id, name, description, dataset_id, steps, created_at, updated_at, metadata FROM pipelines ORDER BY id;");

        for (const auto& row : R) {
            Models::Pipeline p;
            p.id = row["id"].as<long>();
            p.name = row["name"].as<std::string>();
            p.description = row["description"].as<std::string>();
            p.dataset_id = row["dataset_id"].as<long>();
            
            nlohmann::json steps_json = nlohmann::json::parse(row["steps"].as<std::string>());
            if (steps_json.is_array()) {
                for (const auto& step_json : steps_json) {
                    p.steps.push_back(Models::PipelineStep::from_json(step_json));
                }
            }

            p.created_at = row["created_at"].as<time_t>();
            p.updated_at = row["updated_at"].as<time_t>();
            p.metadata = nlohmann::json::parse(row["metadata"].as<std::string>());
            pipelines.push_back(p);
        }
        LOG_DEBUG("Retrieved {} pipelines.", pipelines.size());
        return pipelines;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to retrieve all pipelines: {}", e.what());
        throw Common::DatabaseException(std::string("Failed to retrieve all pipelines: ") + e.what());
    }
}

bool DBManager::update_pipeline(const Models::Pipeline& pipeline) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        nlohmann::json j_steps = nlohmann::json::array();
        for (const auto& step : pipeline.steps) {
            j_steps.push_back(step.to_json());
        }

        const std::string sql =
            "UPDATE pipelines SET name = $1, description = $2, dataset_id = $3, steps = $4, "
            "updated_at = NOW(), metadata = $5 WHERE id = $6;";
        pqxx::result R = W.exec_params(sql,
                                       pipeline.name,
                                       pipeline.description,
                                       pipeline.dataset_id,
                                       j_steps.dump(),
                                       pipeline.metadata.dump(),
                                       pipeline.id);
        W.commit();
        if (R.affected_rows() == 0) {
            LOG_WARN("Update failed: Pipeline with ID {} not found.", pipeline.id);
            return false;
        }
        LOG_INFO("Updated pipeline with ID: {}", pipeline.id);
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to update pipeline with ID {}: {}", pipeline.id, e.what());
        throw Common::DatabaseException(std::string("Failed to update pipeline: ") + e.what());
    }
}

bool DBManager::delete_pipeline(long id) {
    ensure_connection();
    try {
        pqxx::work W(*conn_);
        pqxx::result R = W.exec_params("DELETE FROM pipelines WHERE id = $1;", id);
        W.commit();
        if (R.affected_rows() == 0) {
            LOG_WARN("Delete failed: Pipeline with ID {} not found.", id);
            return false;
        }
        LOG_INFO("Deleted pipeline with ID: {}", id);
        return true;
    } catch (const std::exception& e) {
        LOG_ERROR("Failed to delete pipeline with ID {}: {}", id, e.what());
        throw Common::DatabaseException(std::string("Failed to delete pipeline: ") + e.what());
    }
}

} // namespace Database
} // namespace MLToolkit
```
```cpp
#include "DatasetRepository.h"
#include <nlohmann/json.hpp>

DatasetRepository::DatasetRepository(std::shared_ptr<Database> db) : db_(std::move(db)) {
    try {
        if (!db_->getConnection().is_prepared("insert_dataset")) {
            db_->getConnection().prepare(
                "insert_dataset",
                "INSERT INTO datasets (user_id, name, description, file_path, file_type, columns_metadata) "
                "VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING id, created_at, updated_at"
            );
        }
        if (!db_->getConnection().is_prepared("select_dataset_by_id")) {
            db_->getConnection().prepare(
                "select_dataset_by_id",
                "SELECT id, user_id, name, description, file_path, file_type, columns_metadata, created_at, updated_at FROM datasets WHERE id = $1"
            );
        }
        if (!db_->getConnection().is_prepared("select_datasets_by_user_id")) {
            db_->getConnection().prepare(
                "select_datasets_by_user_id",
                "SELECT id, user_id, name, description, file_path, file_type, columns_metadata, created_at, updated_at FROM datasets WHERE user_id = $1"
            );
        }
        if (!db_->getConnection().is_prepared("select_all_datasets")) {
            db_->getConnection().prepare(
                "select_all_datasets",
                "SELECT id, user_id, name, description, file_path, file_type, columns_metadata, created_at, updated_at FROM datasets"
            );
        }
        if (!db_->getConnection().is_prepared("update_dataset")) {
            db_->getConnection().prepare(
                "update_dataset",
                "UPDATE datasets SET name = $1, description = $2, file_path = $3, file_type = $4, columns_metadata = $5::jsonb, updated_at = NOW() WHERE id = $6"
            );
        }
        if (!db_->getConnection().is_prepared("delete_dataset")) {
            db_->getConnection().prepare(
                "delete_dataset",
                "DELETE FROM datasets WHERE id = $1"
            );
        }
        Logger::debug("Dataset repository prepared statements.");
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error preparing dataset statements: {}", e.what());
    }
}

std::optional<Dataset> DatasetRepository::create(Dataset& dataset) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared(
            "insert_dataset",
            dataset.getUserId(), dataset.getName(), dataset.getDescription(),
            dataset.getFilePath(), dataset.getFileType(), columnsToJson(dataset.getColumns()).dump()
        );
        trans->commit();

        if (!r.empty()) {
            dataset.setId(r[0]["id"].as<int>());
            dataset.setCreatedAt(r[0]["created_at"].as<std::string>());
            dataset.setUpdatedAt(r[0]["updated_at"].as<std::string>());
            Logger::info("Dataset created with ID: {}", *dataset.getId());
            return dataset;
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error creating dataset: {}", e.what());
    } catch (const std::exception& e) {
        Logger::error("Error creating dataset: {}", e.what());
    }
    return std::nullopt;
}

std::optional<Dataset> DatasetRepository::findById(int id) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_dataset_by_id", id);
        trans->commit();

        if (!r.empty()) {
            return datasetFromRow(r[0]);
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding dataset by ID {}: {}", id, e.what());
    }
    return std::nullopt;
}

std::vector<Dataset> DatasetRepository::findByUserId(int user_id) {
    std::vector<Dataset> datasets;
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_datasets_by_user_id", user_id);
        trans->commit();

        for (const auto& row : r) {
            datasets.push_back(datasetFromRow(row));
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding datasets by user ID {}: {}", user_id, e.what());
    }
    return datasets;
}

std::vector<Dataset> DatasetRepository::findAll() {
    std::vector<Dataset> datasets;
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("select_all_datasets");
        trans->commit();

        for (const auto& row : r) {
            datasets.push_back(datasetFromRow(row));
        }
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error finding all datasets: {}", e.what());
    }
    return datasets;
}

bool DatasetRepository::update(const Dataset& dataset) {
    if (!dataset.getId()) {
        Logger::error("Cannot update dataset without an ID.");
        return false;
    }
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared(
            "update_dataset",
            dataset.getName(), dataset.getDescription(), dataset.getFilePath(),
            dataset.getFileType(), columnsToJson(dataset.getColumns()).dump(), *dataset.getId()
        );
        trans->commit();
        Logger::info("Dataset with ID {} updated.", *dataset.getId());
        return r.affected_rows() == 1;
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error updating dataset {}: {}", *dataset.getId(), e.what());
    }
    return false;
}

bool DatasetRepository::remove(int id) {
    try {
        auto trans = db_->getTransaction();
        pqxx::result r = trans->exec_prepared("delete_dataset", id);
        trans->commit();
        Logger::info("Dataset with ID {} deleted.", id);
        return r.affected_rows() == 1;
    } catch (const pqxx::sql_error& e) {
        Logger::error("SQL error deleting dataset {}: {}", id, e.what());
    }
    return false;
}

Dataset DatasetRepository::datasetFromRow(const pqxx::row& row) {
    Dataset dataset(
        row["id"].as<int>(),
        row["user_id"].as<int>(),
        row["name"].as<std::string>(),
        row["description"].as<std::string>(),
        row["file_path"].as<std::string>(),
        row["file_type"].as<std::string>(),
        row["created_at"].as<std::string>(),
        row["updated_at"].as<std::string>()
    );

    // Parse columns_metadata JSONB
    if (!row["columns_metadata"].is_null()) {
        std::string json_str = row["columns_metadata"].as<std::string>();
        try {
            nlohmann::json columns_json = nlohmann::json::parse(json_str);
            dataset.setColumns(jsonToColumns(columns_json));
        } catch (const nlohmann::json::parse_error& e) {
            Logger::error("JSON parse error for columns_metadata of dataset {}: {}", dataset.getId().value_or(-1), e.what());
        }
    }
    return dataset;
}

nlohmann::json DatasetRepository::columnsToJson(const std::vector<ColumnMetadata>& columns) {
    nlohmann::json j_arr = nlohmann::json::array();
    for (const auto& col : columns) {
        j_arr.push_back(col.toJson());
    }
    return j_arr;
}

std::vector<ColumnMetadata> DatasetRepository::jsonToColumns(const nlohmann::json& j) {
    std::vector<ColumnMetadata> columns;
    if (j.is_array()) {
        for (const auto& col_json : j) {
            ColumnMetadata col;
            col.name = col_json.at("name").get<std::string>();
            col.type = col_json.at("type").get<std::string>();
            col.is_dimension = col_json.value("isDimension", false);
            col.is_measure = col_json.value("isMeasure", false);
            columns.push_back(col);
        }
    }
    return columns;
}
```
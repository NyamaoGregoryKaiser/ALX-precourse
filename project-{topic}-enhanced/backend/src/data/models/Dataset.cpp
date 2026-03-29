```cpp
#include "Dataset.h"

Dataset::Dataset(int id, int user_id, std::string name, std::string description, std::string file_path,
                 std::string file_type, std::string created_at, std::string updated_at)
    : id_(id), user_id_(user_id), name_(std::move(name)), description_(std::move(description)),
      file_path_(std::move(file_path)), file_type_(std::move(file_type)),
      created_at_(std::move(created_at)), updated_at_(std::move(updated_at)) {}

Dataset::Dataset(int user_id, std::string name, std::string description, std::string file_path, std::string file_type)
    : user_id_(user_id), name_(std::move(name)), description_(std::move(description)),
      file_path_(std::move(file_path)), file_type_(std::move(file_type)) {}

nlohmann::json Dataset::toJson() const {
    nlohmann::json j;
    if (id_) {
        j["id"] = *id_;
    }
    j["userId"] = user_id_;
    j["name"] = name_;
    j["description"] = description_;
    j["filePath"] = file_path_;
    j["fileType"] = file_type_;
    j["createdAt"] = created_at_;
    j["updatedAt"] = updated_at_;

    nlohmann::json cols_json = nlohmann::json::array();
    for (const auto& col : columns_) {
        cols_json.push_back(col.toJson());
    }
    j["columns"] = cols_json;
    return j;
}

Dataset Dataset::fromJson(const nlohmann::json& j) {
    Dataset dataset;
    if (j.contains("id")) {
        dataset.setId(j.at("id").get<int>());
    }
    dataset.setUserId(j.at("userId").get<int>());
    dataset.setName(j.at("name").get<std::string>());
    dataset.setDescription(j.value("description", "")); // Optional description
    dataset.setFilePath(j.at("filePath").get<std::string>());
    dataset.setFileType(j.at("fileType").get<std::string>());
    
    // Parse columns metadata if present
    if (j.contains("columns") && j.at("columns").is_array()) {
        std::vector<ColumnMetadata> columns;
        for (const auto& col_json : j.at("columns")) {
            ColumnMetadata col;
            col.name = col_json.at("name").get<std::string>();
            col.type = col_json.at("type").get<std::string>();
            col.is_dimension = col_json.value("isDimension", false);
            col.is_measure = col_json.value("isMeasure", false);
            columns.push_back(col);
        }
        dataset.setColumns(columns);
    }
    
    dataset.setCreatedAt(j.value("createdAt", ""));
    dataset.setUpdatedAt(j.value("updatedAt", ""));
    return dataset;
}
```
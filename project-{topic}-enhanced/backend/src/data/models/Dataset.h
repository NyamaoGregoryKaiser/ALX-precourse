```cpp
#ifndef DATAVIZ_DATASET_H
#define DATAVIZ_DATASET_H

#include <string>
#include <optional>
#include <vector>
#include <map>
#include <nlohmann/json.hpp>

// Forward declaration for Crow::json::wvalue
namespace crow {
    struct response;
    namespace json {
        class wvalue;
    }
}

// Represents a column's metadata
struct ColumnMetadata {
    std::string name;
    std::string type; // "string", "number", "date"
    bool is_dimension; // e.g., categorical
    bool is_measure;   // e.g., numeric, aggregatable

    nlohmann::json toJson() const {
        nlohmann::json j;
        j["name"] = name;
        j["type"] = type;
        j["isDimension"] = is_dimension;
        j["isMeasure"] = is_measure;
        return j;
    }
};

class Dataset {
private:
    std::optional<int> id_;
    int user_id_; // Owner of the dataset
    std::string name_;
    std::string description_;
    std::string file_path_; // Path to the actual data file (e.g., CSV)
    std::string file_type_; // e.g., "csv", "json"
    std::vector<ColumnMetadata> columns_; // Metadata about the columns
    std::string created_at_;
    std::string updated_at_;

public:
    Dataset() = default;
    Dataset(int id, int user_id, std::string name, std::string description, std::string file_path,
            std::string file_type, std::string created_at, std::string updated_at);
    // For creating new datasets (ID will be set by DB)
    Dataset(int user_id, std::string name, std::string description, std::string file_path, std::string file_type);

    // Getters
    std::optional<int> getId() const { return id_; }
    int getUserId() const { return user_id_; }
    const std::string& getName() const { return name_; }
    const std::string& getDescription() const { return description_; }
    const std::string& getFilePath() const { return file_path_; }
    const std::string& getFileType() const { return file_type_; }
    const std::vector<ColumnMetadata>& getColumns() const { return columns_; }
    const std::string& getCreatedAt() const { return created_at_; }
    const std::string& getUpdatedAt() const { return updated_at_; }

    // Setters
    void setId(int id) { id_ = id; }
    void setUserId(int user_id) { user_id_ = user_id; }
    void setName(const std::string& name) { name_ = name; }
    void setDescription(const std::string& desc) { description_ = desc; }
    void setFilePath(const std::string& path) { file_path_ = path; }
    void setFileType(const std::string& type) { file_type_ = type; }
    void setColumns(const std::vector<ColumnMetadata>& columns) { columns_ = columns; }
    void setCreatedAt(const std::string& created_at) { created_at_ = created_at; }
    void setUpdatedAt(const std::string& updated_at) { updated_at_ = updated_at; }

    // Convert Dataset object to JSON
    nlohmann::json toJson() const;
    static Dataset fromJson(const nlohmann::json& j);
};

#endif // DATAVIZ_DATASET_H
```
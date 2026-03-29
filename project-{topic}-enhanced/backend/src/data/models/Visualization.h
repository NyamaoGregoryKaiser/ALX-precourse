```cpp
#ifndef DATAVIZ_VISUALIZATION_H
#define DATAVIZ_VISUALIZATION_H

#include <string>
#include <optional>
#include <nlohmann/json.hpp>

// Forward declaration for Crow::json::wvalue
namespace crow {
    struct response;
    namespace json {
        class wvalue;
    }
}

class Visualization {
private:
    std::optional<int> id_;
    int user_id_;
    int dataset_id_;
    std::string name_;
    std::string description_;
    std::string chart_type_; // e.g., "bar", "line", "scatter", "pie"
    nlohmann::json config_;  // JSON object storing chart-specific configurations (axes, colors, filters)
    std::string created_at_;
    std::string updated_at_;

public:
    Visualization() = default;
    Visualization(int id, int user_id, int dataset_id, std::string name, std::string description,
                  std::string chart_type, nlohmann::json config, std::string created_at, std::string updated_at);
    Visualization(int user_id, int dataset_id, std::string name, std::string description,
                  std::string chart_type, nlohmann::json config);

    // Getters
    std::optional<int> getId() const { return id_; }
    int getUserId() const { return user_id_; }
    int getDatasetId() const { return dataset_id_; }
    const std::string& getName() const { return name_; }
    const std::string& getDescription() const { return description_; }
    const std::string& getChartType() const { return chart_type_; }
    const nlohmann::json& getConfig() const { return config_; }
    const std::string& getCreatedAt() const { return created_at_; }
    const std::string& getUpdatedAt() const { return updated_at_; }

    // Setters
    void setId(int id) { id_ = id; }
    void setUserId(int user_id) { user_id_ = user_id; }
    void setDatasetId(int dataset_id) { dataset_id_ = dataset_id; }
    void setName(const std::string& name) { name_ = name; }
    void setDescription(const std::string& desc) { description_ = desc; }
    void setChartType(const std::string& type) { chart_type_ = type; }
    void setConfig(const nlohmann::json& config) { config_ = config; }
    void setCreatedAt(const std::string& created_at) { created_at_ = created_at; }
    void setUpdatedAt(const std::string& updated_at) { updated_at_ = updated_at; }

    // Convert Visualization object to JSON
    nlohmann::json toJson() const;
    static Visualization fromJson(const nlohmann::json& j);
};

#endif // DATAVIZ_VISUALIZATION_H
```
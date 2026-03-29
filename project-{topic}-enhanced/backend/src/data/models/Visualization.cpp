```cpp
#include "Visualization.h"

Visualization::Visualization(int id, int user_id, int dataset_id, std::string name, std::string description,
                             std::string chart_type, nlohmann::json config, std::string created_at, std::string updated_at)
    : id_(id), user_id_(user_id), dataset_id_(dataset_id), name_(std::move(name)), description_(std::move(description)),
      chart_type_(std::move(chart_type)), config_(std::move(config)),
      created_at_(std::move(created_at)), updated_at_(std::move(updated_at)) {}

Visualization::Visualization(int user_id, int dataset_id, std::string name, std::string description,
                             std::string chart_type, nlohmann::json config)
    : user_id_(user_id), dataset_id_(dataset_id), name_(std::move(name)), description_(std::move(description)),
      chart_type_(std::move(chart_type)), config_(std::move(config)) {}

nlohmann::json Visualization::toJson() const {
    nlohmann::json j;
    if (id_) {
        j["id"] = *id_;
    }
    j["userId"] = user_id_;
    j["datasetId"] = dataset_id_;
    j["name"] = name_;
    j["description"] = description_;
    j["chartType"] = chart_type_;
    j["config"] = config_; // This will be the full JSON configuration
    j["createdAt"] = created_at_;
    j["updatedAt"] = updated_at_;
    return j;
}

Visualization Visualization::fromJson(const nlohmann::json& j) {
    Visualization viz;
    if (j.contains("id")) {
        viz.setId(j.at("id").get<int>());
    }
    viz.setUserId(j.at("userId").get<int>());
    viz.setDatasetId(j.at("datasetId").get<int>());
    viz.setName(j.at("name").get<std::string>());
    viz.setDescription(j.value("description", ""));
    viz.setChartType(j.at("chartType").get<std::string>());
    viz.setConfig(j.at("config")); // Take the entire config JSON
    viz.setCreatedAt(j.value("createdAt", ""));
    viz.setUpdatedAt(j.value("updatedAt", ""));
    return viz;
}
```
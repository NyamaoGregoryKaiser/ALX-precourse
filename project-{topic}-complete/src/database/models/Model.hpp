```cpp
#ifndef MLTOOLKIT_MODEL_HPP
#define MLTOOLKIT_MODEL_HPP

#include <string>
#include <vector>
#include <ctime>
#include <nlohmann/json.hpp>
#include <Eigen/Dense>

namespace MLToolkit {
namespace Database {
namespace Models {

enum class ModelType {
    UNKNOWN,
    LINEAR_REGRESSION,
    LOGISTIC_REGRESSION,
    KMEANS,
    // Add more types as needed
};

// Helper function to convert ModelType to string
inline std::string model_type_to_string(ModelType type) {
    switch (type) {
        case ModelType::LINEAR_REGRESSION: return "LINEAR_REGRESSION";
        case ModelType::LOGISTIC_REGRESSION: return "LOGISTIC_REGRESSION";
        case ModelType::KMEANS: return "KMEANS";
        case ModelType::UNKNOWN:
        default: return "UNKNOWN";
    }
}

// Helper function to convert string to ModelType
inline ModelType string_to_model_type(const std::string& type_str) {
    if (type_str == "LINEAR_REGRESSION") return ModelType::LINEAR_REGRESSION;
    if (type_str == "LOGISTIC_REGRESSION") return ModelType::LOGISTIC_REGRESSION;
    if (type_str == "KMEANS") return ModelType::KMEANS;
    return ModelType::UNKNOWN;
}

struct Model {
    long id = 0;
    std::string name;
    std::string description;
    ModelType type = ModelType::UNKNOWN;
    std::string artifact_path; // Path to stored model file (e.g., serialized weights)
    long dataset_id = 0; // Dataset used to train this model
    time_t created_at = 0;
    time_t updated_at = 0;

    // Parameters (e.g., learning rate, regularization) and evaluation metrics
    nlohmann::json metadata;

    // Default constructor
    Model() : created_at(time(nullptr)), updated_at(time(nullptr)) {}

    // Constructor for creating new models
    Model(std::string name, std::string desc, ModelType type, std::string artifact_path,
          long dataset_id, const nlohmann::json& meta = nlohmann::json::object())
        : name(std::move(name)), description(std::move(desc)), type(type),
          artifact_path(std::move(artifact_path)), dataset_id(dataset_id),
          metadata(meta), created_at(time(nullptr)), updated_at(time(nullptr)) {}

    // Convert Model to JSON
    nlohmann::json to_json() const {
        return {
            {"id", id},
            {"name", name},
            {"description", description},
            {"type", model_type_to_string(type)},
            {"artifact_path", artifact_path},
            {"dataset_id", dataset_id},
            {"created_at", created_at},
            {"updated_at", updated_at},
            {"metadata", metadata}
        };
    }

    // Create Model from JSON
    static Model from_json(const nlohmann::json& j) {
        Model m;
        if (j.contains("id")) m.id = j.at("id").get<long>();
        if (j.contains("name")) m.name = j.at("name").get<std::string>();
        if (j.contains("description")) m.description = j.at("description").get<std::string>();
        if (j.contains("type")) m.type = string_to_model_type(j.at("type").get<std::string>());
        if (j.contains("artifact_path")) m.artifact_path = j.at("artifact_path").get<std::string>();
        if (j.contains("dataset_id")) m.dataset_id = j.at("dataset_id").get<long>();
        if (j.contains("created_at")) m.created_at = j.at("created_at").get<time_t>();
        if (j.contains("updated_at")) m.updated_at = j.at("updated_at").get<time_t>();
        if (j.contains("metadata") && j.at("metadata").is_object()) m.metadata = j.at("metadata");
        return m;
    }
};

} // namespace Models
} // namespace Database
} // namespace MLToolkit

#endif // MLTOOLKIT_MODEL_HPP
```
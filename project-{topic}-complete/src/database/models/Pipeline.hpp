```cpp
#ifndef MLTOOLKIT_PIPELINE_HPP
#define MLTOOLKIT_PIPELINE_HPP

#include <string>
#include <vector>
#include <ctime>
#include <nlohmann/json.hpp>

namespace MLToolkit {
namespace Database {
namespace Models {

struct PipelineStep {
    std::string name; // e.g., "MinMaxScaler", "MeanImputer", "PolynomialFeatures"
    nlohmann::json params; // Parameters for the step, e.g., {"feature_range": [0, 1]}

    nlohmann::json to_json() const {
        return {
            {"name", name},
            {"params", params}
        };
    }

    static PipelineStep from_json(const nlohmann::json& j) {
        PipelineStep step;
        if (j.contains("name")) step.name = j.at("name").get<std::string>();
        if (j.contains("params") && j.at("params").is_object()) step.params = j.at("params");
        return step;
    }
};

struct Pipeline {
    long id = 0;
    std::string name;
    std::string description;
    long dataset_id = 0; // The dataset this pipeline was designed for/applied to
    std::vector<PipelineStep> steps;
    time_t created_at = 0;
    time_t updated_at = 0;

    nlohmann::json metadata; // Any additional info or trained parameters of the pipeline (e.g., scaler min/max)

    // Default constructor
    Pipeline() : created_at(time(nullptr)), updated_at(time(nullptr)) {}

    // Constructor for creating new pipelines
    Pipeline(std::string name, std::string desc, long dataset_id,
             std::vector<PipelineStep> steps, const nlohmann::json& meta = nlohmann::json::object())
        : name(std::move(name)), description(std::move(desc)), dataset_id(dataset_id),
          steps(std::move(steps)), metadata(meta), created_at(time(nullptr)), updated_at(time(nullptr)) {}

    // Convert Pipeline to JSON
    nlohmann::json to_json() const {
        nlohmann::json j_steps = nlohmann::json::array();
        for (const auto& step : steps) {
            j_steps.push_back(step.to_json());
        }
        return {
            {"id", id},
            {"name", name},
            {"description", description},
            {"dataset_id", dataset_id},
            {"steps", j_steps},
            {"created_at", created_at},
            {"updated_at", updated_at},
            {"metadata", metadata}
        };
    }

    // Create Pipeline from JSON
    static Pipeline from_json(const nlohmann::json& j) {
        Pipeline p;
        if (j.contains("id")) p.id = j.at("id").get<long>();
        if (j.contains("name")) p.name = j.at("name").get<std::string>();
        if (j.contains("description")) p.description = j.at("description").get<std::string>();
        if (j.contains("dataset_id")) p.dataset_id = j.at("dataset_id").get<long>();
        if (j.contains("steps") && j.at("steps").is_array()) {
            for (const auto& step_json : j.at("steps")) {
                p.steps.push_back(PipelineStep::from_json(step_json));
            }
        }
        if (j.contains("created_at")) p.created_at = j.at("created_at").get<time_t>();
        if (j.contains("updated_at")) p.updated_at = j.at("updated_at").get<time_t>();
        if (j.contains("metadata") && j.at("metadata").is_object()) p.metadata = j.at("metadata");
        return p;
    }
};

} // namespace Models
} // namespace Database
} // namespace MLToolkit

#endif // MLTOOLKIT_PIPELINE_HPP
```
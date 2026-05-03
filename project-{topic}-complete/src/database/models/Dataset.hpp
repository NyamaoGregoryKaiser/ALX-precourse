```cpp
#ifndef MLTOOLKIT_DATASET_HPP
#define MLTOOLKIT_DATASET_HPP

#include <string>
#include <vector>
#include <ctime>
#include <nlohmann/json.hpp>
#include <Eigen/Dense>

namespace MLToolkit {
namespace Database {
namespace Models {

struct Dataset {
    long id = 0; // 0 for new datasets, actual ID for existing
    std::string name;
    std::string description;
    std::string file_path; // Path to stored CSV/binary data
    long row_count = 0;
    long col_count = 0;
    std::vector<std::string> feature_names;
    time_t created_at = 0;
    time_t updated_at = 0;

    // Optional: Store a small preview or statistics in JSON
    nlohmann::json metadata;

    // Default constructor
    Dataset() : created_at(time(nullptr)), updated_at(time(nullptr)) {}

    // Constructor for creating new datasets
    Dataset(std::string name, std::string desc, std::string path,
            long rows, long cols, std::vector<std::string> features,
            const nlohmann::json& meta = nlohmann::json::object())
        : name(std::move(name)), description(std::move(desc)), file_path(std::move(path)),
          row_count(rows), col_count(cols), feature_names(std::move(features)),
          metadata(meta), created_at(time(nullptr)), updated_at(time(nullptr)) {}

    // Convert Dataset to JSON
    nlohmann::json to_json() const {
        return {
            {"id", id},
            {"name", name},
            {"description", description},
            {"file_path", file_path},
            {"row_count", row_count},
            {"col_count", col_count},
            {"feature_names", feature_names},
            {"created_at", created_at},
            {"updated_at", updated_at},
            {"metadata", metadata}
        };
    }

    // Create Dataset from JSON
    static Dataset from_json(const nlohmann::json& j) {
        Dataset ds;
        if (j.contains("id")) ds.id = j.at("id").get<long>();
        if (j.contains("name")) ds.name = j.at("name").get<std::string>();
        if (j.contains("description")) ds.description = j.at("description").get<std::string>();
        if (j.contains("file_path")) ds.file_path = j.at("file_path").get<std::string>();
        if (j.contains("row_count")) ds.row_count = j.at("row_count").get<long>();
        if (j.contains("col_count")) ds.col_count = j.at("col_count").get<long>();
        if (j.contains("feature_names")) ds.feature_names = j.at("feature_names").get<std::vector<std::string>>();
        if (j.contains("created_at")) ds.created_at = j.at("created_at").get<time_t>();
        if (j.contains("updated_at")) ds.updated_at = j.at("updated_at").get<time_t>();
        if (j.contains("metadata") && j.at("metadata").is_object()) ds.metadata = j.at("metadata");
        return ds;
    }
};

} // namespace Models
} // namespace Database
} // namespace MLToolkit

#endif // MLTOOLKIT_DATASET_HPP
```
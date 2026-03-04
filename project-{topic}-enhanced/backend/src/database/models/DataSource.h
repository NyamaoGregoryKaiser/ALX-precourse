#pragma once

#include <string>
#include <chrono>
#include <nlohmann/json.hpp>
#include "User.h" // For to_iso8601

struct DataSource {
    std::string id;
    std::string user_id;
    std::string name;
    std::string type; // e.g., "CSV", "PostgreSQL", "API"
    std::string connection_string; // For DBs or APIs
    std::string schema_definition; // JSON string of column types, etc.
    std::string file_path; // For file-based sources like CSV
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    DataSource() = default;

    nlohmann::json toJson() const {
        return nlohmann::json{
            {"id", id},
            {"user_id", user_id},
            {"name", name},
            {"type", type},
            {"connection_string", connection_string},
            {"schema_definition", schema_definition},
            {"file_path", file_path},
            {"created_at", to_iso8601(created_at)},
            {"updated_at", to_iso8601(updated_at)}
        };
    }
};
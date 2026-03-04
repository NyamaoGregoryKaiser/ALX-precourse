#pragma once

#include <string>
#include <chrono>
#include <nlohmann/json.hpp>
#include "User.h" // For to_iso8601

struct Visualization {
    std::string id;
    std::string user_id;
    std::string name;
    std::string description;
    std::string data_source_id; // Foreign key to DataSource
    std::string type; // e.g., "bar_chart", "line_chart", "pie_chart", "scatter_plot"
    std::string configuration; // JSON string for chart options, mappings (x-axis, y-axis, colors, filters, aggregations)
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    Visualization() = default;

    nlohmann::json toJson() const {
        return nlohmann::json{
            {"id", id},
            {"user_id", user_id},
            {"name", name},
            {"description", description},
            {"data_source_id", data_source_id},
            {"type", type},
            {"configuration", nlohmann::json::parse(configuration, nullptr, false)}, // Parse back to JSON object
            {"created_at", to_iso8601(created_at)},
            {"updated_at", to_iso8601(updated_at)}
        };
    }
};
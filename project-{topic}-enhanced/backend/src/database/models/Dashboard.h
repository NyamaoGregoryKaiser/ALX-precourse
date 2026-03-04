#pragma once

#include <string>
#include <chrono>
#include <nlohmann/json.hpp>
#include "User.h" // For to_iso8601

struct Dashboard {
    std::string id;
    std::string user_id;
    std::string name;
    std::string description;
    std::string layout_config; // JSON string defining grid layout and contained visualizations/widgets
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    Dashboard() = default;

    nlohmann::json toJson() const {
        return nlohmann::json{
            {"id", id},
            {"user_id", user_id},
            {"name", name},
            {"description", description},
            {"layout_config", nlohmann::json::parse(layout_config, nullptr, false)},
            {"created_at", to_iso8601(created_at)},
            {"updated_at", to_iso8601(updated_at)}
        };
    }
};
#pragma once

#include <string>
#include <chrono>
#include <optional>
#include <nlohmann/json.hpp>

struct Project {
    std::string id;
    std::string name;
    std::optional<std::string> description;
    std::optional<std::string> start_date; // YYYY-MM-DD format
    std::optional<std::string> end_date;   // YYYY-MM-DD format
    std::string status; // e.g., 'planning', 'in-progress', 'completed', 'on-hold'
    std::string owner_id;
    std::optional<std::string> team_id;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    Project() = default;

    Project(const std::string& name, const std::string& owner_id,
            const std::optional<std::string>& description = std::nullopt,
            const std::optional<std::string>& start_date = std::nullopt,
            const std::optional<std::string>& end_date = std::nullopt,
            const std::string& status = "planning",
            const std::optional<std::string>& team_id = std::nullopt)
        : name(name), description(description), start_date(start_date), end_date(end_date),
          status(status), owner_id(owner_id), team_id(team_id) {}
};

void to_json(nlohmann::json& j, const Project& p);
void from_json(const nlohmann::json& j, Project& p);
```
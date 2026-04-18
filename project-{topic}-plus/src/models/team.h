#pragma once

#include <string>
#include <chrono>
#include <optional>
#include <nlohmann/json.hpp>
#include <vector>

struct Team {
    std::string id;
    std::string name;
    std::optional<std::string> description;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;
    std::vector<std::string> member_ids; // For displaying team members, not stored in main teams table

    Team() = default;

    Team(const std::string& name, const std::optional<std::string>& description = std::nullopt)
        : name(name), description(description) {}
};

void to_json(nlohmann::json& j, const Team& t);
void from_json(const nlohmann::json& j, Team& t);
```
```cpp
#ifndef PROJECT_H
#define PROJECT_H

#include <string>
#include <json/json.hpp>
#include <optional>

namespace TaskManager {
namespace Models {

struct Project {
    std::optional<long long> id;
    std::string name;
    std::optional<std::string> description;
    long long owner_id; // Foreign key to User
    std::optional<std::string> created_at;
    std::optional<std::string> updated_at;

    Project() : owner_id(0) {}

    // Convert Project object to JSON
    nlohmann::json toJson() const {
        nlohmann::json j;
        if (id) j["id"] = *id;
        j["name"] = name;
        if (description) j["description"] = *description;
        j["owner_id"] = owner_id;
        if (created_at) j["created_at"] = *created_at;
        if (updated_at) j["updated_at"] = *updated_at;
        return j;
    }

    // Convert JSON to Project object
    static Project fromJson(const nlohmann::json& j) {
        Project project;
        if (j.contains("id") && j["id"].is_number()) project.id = j["id"].get<long long>();
        if (j.contains("name") && j["name"].is_string()) project.name = j["name"].get<std::string>();
        if (j.contains("description") && j["description"].is_string()) project.description = j["description"].get<std::string>();
        if (j.contains("owner_id") && j["owner_id"].is_number()) project.owner_id = j["owner_id"].get<long long>();
        if (j.contains("created_at") && j["created_at"].is_string()) project.created_at = j["created_at"].get<std::string>();
        if (j.contains("updated_at") && j["updated_at"].is_string()) project.updated_at = j["updated_at"].get<std::string>();
        return project;
    }
};

} // namespace Models
} // namespace TaskManager

#endif // PROJECT_H
```
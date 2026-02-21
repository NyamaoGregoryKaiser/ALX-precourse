```cpp
#ifndef SYSTEM_H
#define SYSTEM_H

#include <string>
#include <nlohmann/json.hpp>
#include <optional>

struct System {
    std::string id;
    std::string user_id;
    std::string name;
    std::optional<std::string> description; // Optional field
    std::string api_key; // Unique key for metric ingestion
    std::string created_at;
    std::string updated_at;

    nlohmann::json to_json() const {
        nlohmann::json j = {
            {"id", id},
            {"user_id", user_id},
            {"name", name},
            {"api_key", api_key},
            {"created_at", created_at},
            {"updated_at", updated_at}
        };
        if (description) {
            j["description"] = *description;
        }
        return j;
    }

    static System from_json(const nlohmann::json& j) {
        System system;
        system.id = j.at("id").get<std::string>();
        system.user_id = j.at("user_id").get<std::string>();
        system.name = j.at("name").get<std::string>();
        system.description = j.value("description", std::optional<std::string>());
        system.api_key = j.at("api_key").get<std::string>();
        system.created_at = j.value("created_at", "");
        system.updated_at = j.value("updated_at", "");
        return system;
    }
};

#endif // SYSTEM_H
```
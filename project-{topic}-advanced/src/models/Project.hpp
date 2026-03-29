```cpp
#ifndef PROJECT_HPP
#define PROJECT_HPP

#include <string>
#include <optional>
#include "json.hpp"

struct Project {
    std::optional<int> id;
    std::string name;
    std::string description;
    std::optional<int> owner_id; // User who owns/created the project

    Project() {}

    Project(int id, const std::string& name, const std::string& description, std::optional<int> owner_id = std::nullopt)
        : id(id), name(name), description(description), owner_id(owner_id) {}

    Project(const std::string& name, const std::string& description, std::optional<int> owner_id = std::nullopt)
        : name(name), description(description), owner_id(owner_id) {}

    nlohmann::json toJson() const {
        nlohmann::json j;
        if (id.has_value()) {
            j["id"] = id.value();
        }
        j["name"] = name;
        j["description"] = description;
        if (owner_id.has_value()) {
            j["owner_id"] = owner_id.value();
        } else {
            j["owner_id"] = nullptr; // Explicitly null if not set
        }
        return j;
    }
};

#endif // PROJECT_HPP
```
```cpp
#ifndef USER_H
#define USER_H

#include <string>
#include <json/json.hpp>
#include <optional>
#include "BaseModels.h"

namespace TaskManager {
namespace Models {

struct User {
    std::optional<long long> id;
    std::string username;
    std::string password_hash; // Stored securely hashed
    std::optional<std::string> email;
    UserRole role;
    std::optional<std::string> created_at;
    std::optional<std::string> updated_at;

    User() : role(UserRole::USER) {}

    // Convert User object to JSON
    nlohmann::json toJson(bool include_password_hash = false) const {
        nlohmann::json j;
        if (id) j["id"] = *id;
        j["username"] = username;
        if (include_password_hash) {
            j["password_hash"] = password_hash;
        }
        if (email) j["email"] = *email;
        j["role"] = userRoleToString(role);
        if (created_at) j["created_at"] = *created_at;
        if (updated_at) j["updated_at"] = *updated_at;
        return j;
    }

    // Convert JSON to User object (for request bodies)
    static User fromJson(const nlohmann::json& j) {
        User user;
        if (j.contains("id") && j["id"].is_number()) user.id = j["id"].get<long long>();
        if (j.contains("username") && j["username"].is_string()) user.username = j["username"].get<std::string>();
        if (j.contains("password_hash") && j["password_hash"].is_string()) user.password_hash = j["password_hash"].get<std::string>();
        if (j.contains("email") && j["email"].is_string()) user.email = j["email"].get<std::string>();
        if (j.contains("role") && j["role"].is_string()) user.role = stringToUserRole(j["role"].get<std::string>());
        if (j.contains("created_at") && j["created_at"].is_string()) user.created_at = j["created_at"].get<std::string>();
        if (j.contains("updated_at") && j["updated_at"].is_string()) user.updated_at = j["updated_at"].get<std::string>();
        return user;
    }
};

} // namespace Models
} // namespace TaskManager

#endif // USER_H
```
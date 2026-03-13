#ifndef CMS_USER_HPP
#define CMS_USER_HPP

#include <string>
#include <chrono>
#include <optional>
#include <nlohmann/json.hpp>
#include "../common/json_utils.hpp"

namespace cms::models {

enum class UserRole {
    VIEWER,
    EDITOR,
    ADMIN
};

// Convert UserRole to string
inline std::string user_role_to_string(UserRole role) {
    switch (role) {
        case UserRole::VIEWER: return "viewer";
        case UserRole::EDITOR: return "editor";
        case UserRole::ADMIN: return "admin";
        default: return "unknown";
    }
}

// Convert string to UserRole
inline UserRole string_to_user_role(const std::string& role_str) {
    if (role_str == "admin") return UserRole::ADMIN;
    if (role_str == "editor") return UserRole::EDITOR;
    return UserRole::VIEWER; // Default or 'viewer'
}


struct User {
    std::string id;
    std::string username;
    std::string email;
    std::string password_hash; // Stored hashed password
    UserRole role;
    std::chrono::system_clock::time_point created_at;
    std::chrono::system_clock::time_point updated_at;

    // Optional fields for updates or partial data
    struct UpdateFields {
        std::optional<std::string> username;
        std::optional<std::string> email;
        std::optional<std::string> password; // Raw password to be hashed
        std::optional<UserRole> role;
    };

    // Convert User object to JSON
    nlohmann::json to_json() const {
        nlohmann::json j;
        j["id"] = id;
        j["username"] = username;
        j["email"] = email;
        j["role"] = user_role_to_string(role);
        j["created_at"] = common::format_iso8601(created_at);
        j["updated_at"] = common::format_iso8601(updated_at);
        return j;
    }

    // Create User object from JSON (for registration/login)
    static User from_json_create(const nlohmann::json& j) {
        User user;
        user.username = common::get_json_string_required(j, "username");
        user.email = common::get_json_string_required(j, "email");
        user.password_hash = common::get_json_string_required(j, "password"); // This will be hashed by service layer
        user.role = string_to_user_role(common::get_json_string(j, "role").value_or("viewer"));
        return user;
    }

    // Create User::UpdateFields from JSON
    static UpdateFields update_from_json(const nlohmann::json& j) {
        UpdateFields updates;
        if (auto val = common::get_json_string(j, "username")) updates.username = val;
        if (auto val = common::get_json_string(j, "email")) updates.email = val;
        if (auto val = common::get_json_string(j, "password")) updates.password = val; // Raw password
        if (auto role_str = common::get_json_string(j, "role")) {
            updates.role = string_to_user_role(*role_str);
        }
        return updates;
    }
};

} // namespace cms::models

#endif // CMS_USER_HPP
```
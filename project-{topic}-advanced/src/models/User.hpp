```cpp
#ifndef USER_HPP
#define USER_HPP

#include <string>
#include <vector>
#include <optional>
#include "json.hpp" // From nlohmann/json

enum class UserRole {
    USER,
    ADMIN
};

// Helper to convert string to UserRole
static UserRole stringToUserRole(const std::string& role_str) {
    if (role_str == "ADMIN") {
        return UserRole::ADMIN;
    }
    return UserRole::USER;
}

// Helper to convert UserRole to string
static std::string userRoleToString(UserRole role) {
    switch (role) {
        case UserRole::ADMIN: return "ADMIN";
        case UserRole::USER: return "USER";
        default: return "UNKNOWN"; // Should not happen
    }
}

struct User {
    std::optional<int> id; // Optional for creation (ID assigned by DB)
    std::string username;
    std::string email;
    std::string password_hash;
    UserRole role;

    // Default constructor
    User() : role(UserRole::USER) {}

    // Constructor for existing users
    User(int id, const std::string& username, const std::string& email, const std::string& password_hash, UserRole role)
        : id(id), username(username), email(email), password_hash(password_hash), role(role) {}

    // Constructor for new users (without ID)
    User(const std::string& username, const std::string& email, const std::string& password_hash, UserRole role)
        : username(username), email(email), password_hash(password_hash), role(role) {}

    // Convert User object to JSON
    nlohmann::json toJson() const {
        nlohmann::json j;
        if (id.has_value()) {
            j["id"] = id.value();
        }
        j["username"] = username;
        j["email"] = email;
        j["role"] = userRoleToString(role);
        // Do not include password_hash in public JSON representation
        return j;
    }
};

#endif // USER_HPP
```
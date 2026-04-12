#pragma once

#include <string>
#include <vector>
#include <optional>
#include <json/json.h> // For converting to/from JSON

#include "src/database/database_manager.h" // For DbRow

// Enum for user roles
enum class UserRole {
    USER,
    ADMIN
};

std::string user_role_to_string(UserRole role);
UserRole string_to_user_role(const std::string& role_str);

class User {
public:
    long id = 0;
    std::string username;
    std::string password_hash; // Stored as hash
    UserRole role = UserRole::USER;
    std::string created_at; // ISO 8601 string
    std::string updated_at; // ISO 8601 string

    User() = default;
    User(long id, const std::string& username, const std::string& password_hash,
         UserRole role, const std::string& created_at, const std::string& updated_at);

    // Convert DbRow to User object
    static std::optional<User> from_db_row(const DbRow& row);

    // Convert User object to JSON
    Json::Value to_json(bool include_sensitive_data = false) const;

    // CRUD operations
    static std::optional<User> create(const std::string& username, const std::string& password_hash, UserRole role);
    static std::optional<User> find_by_id(long id);
    static std::optional<User> find_by_username(const std::string& username);
    static std::vector<User> find_all();
    bool update(); // Updates current user object in DB
    bool remove(); // Deletes current user object from DB

private:
    static std::string get_current_timestamp();
};
```
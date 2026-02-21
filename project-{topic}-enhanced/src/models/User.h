```cpp
#ifndef USER_H
#define USER_H

#include <string>
#include <nlohmann/json.hpp>
#include <optional>

struct User {
    std::string id;
    std::string username;
    std::string email;
    std::string password_hash; // Stored securely
    std::string created_at;
    std::string updated_at;

    // Convert User object to JSON
    nlohmann::json to_json() const {
        return nlohmann::json{
            {"id", id},
            {"username", username},
            {"email", email},
            {"created_at", created_at},
            {"updated_at", updated_at}
        };
    }

    // Static method to create User object from JSON
    static User from_json(const nlohmann::json& j) {
        User user;
        user.id = j.at("id").get<std::string>();
        user.username = j.at("username").get<std::string>();
        user.email = j.at("email").get<std::string>();
        user.password_hash = j.value("password_hash", ""); // Password hash is sensitive, not usually in API responses
        user.created_at = j.value("created_at", "");
        user.updated_at = j.value("updated_at", "");
        return user;
    }
};

#endif // USER_H
```
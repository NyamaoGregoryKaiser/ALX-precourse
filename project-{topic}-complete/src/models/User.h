```cpp
#pragma once

#include <string>
#include <json/json.h>
#include <optional>

struct User {
    long id = 0;
    std::string username;
    std::string email;
    std::string password_hash; // Store hashed password, not plain text
    std::string created_at;
    std::string updated_at;

    // Convert User struct to Json::Value for API responses
    Json::Value toJson() const {
        Json::Value root;
        root["id"] = id;
        root["username"] = username;
        root["email"] = email;
        root["created_at"] = created_at;
        root["updated_at"] = updated_at;
        // Do NOT expose password_hash
        return root;
    }

    // Populate User struct from Json::Value (e.g., for registration input)
    static User fromJson(const Json::Value& json) {
        User user;
        if (json.isMember("id") && json["id"].isNumeric()) user.id = json["id"].asInt64();
        if (json.isMember("username") && json["username"].isString()) user.username = json["username"].asString();
        if (json.isMember("email") && json["email"].isString()) user.email = json["email"].asString();
        // password_hash is set by the service, not directly from input JSON
        // created_at/updated_at are typically set by DB or service
        return user;
    }
};
```
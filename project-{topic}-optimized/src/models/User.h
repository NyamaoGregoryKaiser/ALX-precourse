#pragma once

#include <string>
#include <json/json.h> // For JSON serialization/deserialization

namespace models {

struct User {
    long long id = 0;
    std::string username;
    std::string email;
    std::string passwordHash;
    std::string passwordSalt; // Store salt for hashing
    std::string role; // e.g., "user", "admin"
    std::string createdAt;
    std::string updatedAt;

    // Convert User object to JSON
    Json::Value toJson() const {
        Json::Value userJson;
        userJson["id"] = id;
        userJson["username"] = username;
        userJson["email"] = email;
        userJson["role"] = role;
        userJson["created_at"] = createdAt;
        userJson["updated_at"] = updatedAt;
        return userJson;
    }

    // Create User object from JSON (e.g., for request body)
    static User fromJson(const Json::Value& json) {
        User user;
        if (json.isMember("id") && json["id"].isInt64()) {
            user.id = json["id"].asInt64();
        }
        if (json.isMember("username") && json["username"].isString()) {
            user.username = json["username"].asString();
        }
        if (json.isMember("email") && json["email"].isString()) {
            user.email = json["email"].asString();
        }
        if (json.isMember("password_hash") && json["password_hash"].isString()) {
            user.passwordHash = json["password_hash"].asString();
        }
        if (json.isMember("password_salt") && json["password_salt"].isString()) {
            user.passwordSalt = json["password_salt"].asString();
        }
        if (json.isMember("role") && json["role"].isString()) {
            user.role = json["role"].asString();
        }
        if (json.isMember("created_at") && json["created_at"].isString()) {
            user.createdAt = json["created_at"].asString();
        }
        if (json.isMember("updated_at") && json["updated_at"].isString()) {
            user.updatedAt = json["updated_at"].asString();
        }
        return user;
    }
};

} // namespace models
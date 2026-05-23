```cpp
#pragma once

#include <drogon/orm/Mapper.h>
#include <drogon/orm/DbClient.h>
#include <string>
#include <vector>
#include <json/json.h>

namespace CMS::Models {

struct User {
    long long id = 0;
    std::string username;
    std::string email;
    std::string password_hash;
    std::string role; // e.g., "admin", "editor", "viewer"
    std::string created_at;
    std::string updated_at;

    // Helper to convert User object to JSON
    Json::Value toJson() const {
        Json::Value root;
        root["id"] = (Json::Int64)id;
        root["username"] = username;
        root["email"] = email;
        root["role"] = role;
        root["created_at"] = created_at;
        root["updated_at"] = updated_at;
        return root;
    }
};

// A simple ORM-like wrapper for User operations
class UserMapper {
public:
    explicit UserMapper(drogon::orm::DbClientPtr dbClient);

    // CRUD Operations
    drogon::orm::Future<User> findById(long long id);
    drogon::orm::Future<User> findByEmail(const std::string& email);
    drogon::orm::Future<User> findByUsername(const std::string& username);
    drogon::orm::Future<std::vector<User>> findAll();
    drogon::orm::Future<User> create(const User& user);
    drogon::orm::Future<User> update(const User& user);
    drogon::orm::Future<void> remove(long long id);

    // Utility
    static std::string hashPassword(const std::string& password);
    static bool verifyPassword(const std::string& password, const std::string& hashedPassword);

private:
    drogon::orm::DbClientPtr dbClient_;
};

} // namespace CMS::Models
```
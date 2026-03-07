```cpp
#pragma once

#include <drogon/orm/Mapper.h>
#include <drogon/orm/Result.h>
#include <drogon/orm/DbClient.h>
#include <string>
#include <memory>
#include <json/json.h>

// For manual models, we define the structure.
// If using drogon_add_orm_target, these would be generated.
// For simplicity in this example, we'll map JSON/SQL manually in services/controllers.

class User {
public:
    int id = 0;
    std::string username;
    std::string email;
    std::string password_hash; // Hashed password
    std::string created_at;

    Json::Value toJson() const {
        Json::Value userJson;
        userJson["id"] = id;
        userJson["username"] = username;
        userJson["email"] = email;
        userJson["created_at"] = created_at;
        return userJson;
    }

    // Static method to create a User from a Drogon ORM Result row
    static User fromDbResult(const drogon::orm::Result& result, int rowIdx) {
        User user;
        user.id = result[rowIdx]["id"].as<int>();
        user.username = result[rowIdx]["username"].as<std::string>();
        user.email = result[rowIdx]["email"].as<std::string>();
        user.password_hash = result[rowIdx]["password_hash"].as<std::string>();
        user.created_at = result[rowIdx]["created_at"].as<std::string>();
        return user;
    }
};

// Define an ORM model class for Drogon's Mapper
// This requires a table name and primary key, and maps C++ fields to DB columns.
// This is a simplified approach, a full drogon_add_orm_target generates more.
namespace drogon::orm {
    template<>
    struct FieldMapper<User> {
        static constexpr const char* tableName = "users";
        static constexpr const char* primaryKeyName = "id";
        static constexpr bool isAutoCreatedPrimaryKey = true;

        static std::map<std::string, std::string> getColumnMap() {
            return {
                {"id", "id"},
                {"username", "username"},
                {"email", "email"},
                {"password_hash", "password_hash"},
                {"created_at", "created_at"}
            };
        }
    };
}
```
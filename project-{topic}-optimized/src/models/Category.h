```cpp
#pragma once

#include <string>
#include <json/json.h>
#include <drogon/orm/Mapper.h>
#include <drogon/orm/Result.h>

class Category {
public:
    int id = 0;
    std::string name;
    int user_id = 0; // Owner of the category
    std::string created_at;

    Json::Value toJson() const {
        Json::Value categoryJson;
        categoryJson["id"] = id;
        categoryJson["name"] = name;
        categoryJson["user_id"] = user_id;
        categoryJson["created_at"] = created_at;
        return categoryJson;
    }

    static Category fromDbResult(const drogon::orm::Result& result, int rowIdx) {
        Category category;
        category.id = result[rowIdx]["id"].as<int>();
        category.name = result[rowIdx]["name"].as<std::string>();
        category.user_id = result[rowIdx]["user_id"].as<int>();
        category.created_at = result[rowIdx]["created_at"].as<std::string>();
        return category;
    }
};

namespace drogon::orm {
    template<>
    struct FieldMapper<Category> {
        static constexpr const char* tableName = "categories";
        static constexpr const char* primaryKeyName = "id";
        static constexpr bool isAutoCreatedPrimaryKey = true;

        static std::map<std::string, std::string> getColumnMap() {
            return {
                {"id", "id"},
                {"name", "name"},
                {"user_id", "user_id"},
                {"created_at", "created_at"}
            };
        }
    };
}
```
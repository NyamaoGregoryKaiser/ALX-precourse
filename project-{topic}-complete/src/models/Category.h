```cpp
#pragma once

#include <drogon/orm/Mapper.h>
#include <drogon/orm/DbClient.h>
#include <string>
#include <vector>
#include <json/json.h>

namespace CMS::Models {

struct Category {
    long long id = 0;
    std::string name;
    std::string description;
    std::string created_at;
    std::string updated_at;

    Json::Value toJson() const {
        Json::Value root;
        root["id"] = (Json::Int64)id;
        root["name"] = name;
        root["description"] = description;
        root["created_at"] = created_at;
        root["updated_at"] = updated_at;
        return root;
    }
};

class CategoryMapper {
public:
    explicit CategoryMapper(drogon::orm::DbClientPtr dbClient);

    drogon::orm::Future<Category> findById(long long id);
    drogon::orm::Future<std::vector<Category>> findAll();
    drogon::orm::Future<Category> create(const Category& category);
    drogon::orm::Future<Category> update(const Category& category);
    drogon::orm::Future<void> remove(long long id);

private:
    drogon::orm::DbClientPtr dbClient_;
};

} // namespace CMS::Models
```
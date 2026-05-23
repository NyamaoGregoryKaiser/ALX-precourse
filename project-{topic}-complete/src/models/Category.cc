```cpp
#include "Category.h"
#include <drogon/drogon.h>

namespace CMS::Models {

CategoryMapper::CategoryMapper(drogon::orm::DbClientPtr dbClient) : dbClient_(std::move(dbClient)) {}

drogon::orm::Future<Category> CategoryMapper::findById(long long id) {
    auto query = "SELECT id, name, description, created_at, updated_at FROM categories WHERE id = $1";
    return dbClient_->execSqlAsync(query, id).then([=](const drogon::orm::Result& result) {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("Category not found", 0);
        }
        const auto& row = result[0];
        return Category{
            row["id"].as<long long>(),
            row["name"].as<std::string>(),
            row["description"].as<std::string>(),
            row["created_at"].as<std::string>(),
            row["updated_at"].as<std::string>()
        };
    });
}

drogon::orm::Future<std::vector<Category>> CategoryMapper::findAll() {
    auto query = "SELECT id, name, description, created_at, updated_at FROM categories ORDER BY name ASC";
    return dbClient_->execSqlAsync(query).then([=](const drogon::orm::Result& result) {
        std::vector<Category> categories;
        for (const auto& row : result) {
            categories.push_back(Category{
                row["id"].as<long long>(),
                row["name"].as<std::string>(),
                row["description"].as<std::string>(),
                row["created_at"].as<std::string>(),
                row["updated_at"].as<std::string>()
            });
        }
        return categories;
    });
}

drogon::orm::Future<Category> CategoryMapper::create(const Category& category) {
    auto query = "INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id, created_at, updated_at";
    return dbClient_->execSqlAsync(query,
                                   category.name,
                                   category.description).then([category](const drogon::orm::Result& result) mutable {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("Failed to create category", 0);
        }
        const auto& row = result[0];
        category.id = row["id"].as<long long>();
        category.created_at = row["created_at"].as<std::string>();
        category.updated_at = row["updated_at"].as<std::string>();
        return category;
    });
}

drogon::orm::Future<Category> CategoryMapper::update(const Category& category) {
    auto query = "UPDATE categories SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING updated_at";
    return dbClient_->execSqlAsync(query,
                                   category.name,
                                   category.description,
                                   category.id).then([category](const drogon::orm::Result& result) mutable {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("Category not found for update", 0);
        }
        const auto& row = result[0];
        category.updated_at = row["updated_at"].as<std::string>();
        return category;
    });
}

drogon::orm::Future<void> CategoryMapper::remove(long long id) {
    auto query = "DELETE FROM categories WHERE id = $1";
    return dbClient_->execSqlAsync(query, id).then([](const drogon::orm::Result& result) {
        if (result.affectedRows() == 0) {
            throw drogon::orm::UnexpectedRows("Category not found for deletion", 0);
        }
    });
}

} // namespace CMS::Models
```
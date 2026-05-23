```cpp
#pragma once

#include <drogon/orm/Mapper.h>
#include <drogon/orm/DbClient.h>
#include <string>
#include <vector>
#include <json/json.h>

namespace CMS::Models {

struct Post {
    long long id = 0;
    std::string title;
    std::string content;
    long long author_id;
    long long category_id;
    bool published = false;
    std::string content_type; // e.g., "markdown", "html", "text"
    std::string created_at;
    std::string updated_at;

    Json::Value toJson() const {
        Json::Value root;
        root["id"] = (Json::Int64)id;
        root["title"] = title;
        root["content"] = content;
        root["author_id"] = (Json::Int64)author_id;
        root["category_id"] = (Json::Int64)category_id;
        root["published"] = published;
        root["content_type"] = content_type;
        root["created_at"] = created_at;
        root["updated_at"] = updated_at;
        return root;
    }
};

class PostMapper {
public:
    explicit PostMapper(drogon::orm::DbClientPtr dbClient);

    drogon::orm::Future<Post> findById(long long id);
    drogon::orm::Future<std::vector<Post>> findAll();
    drogon::orm::Future<std::vector<Post>> findByAuthor(long long author_id);
    drogon::orm::Future<std::vector<Post>> findByCategory(long long category_id);
    drogon::orm::Future<Post> create(const Post& post);
    drogon::orm::Future<Post> update(const Post& post);
    drogon::orm::Future<void> remove(long long id);

private:
    drogon::orm::DbClientPtr dbClient_;
};

} // namespace CMS::Models
```
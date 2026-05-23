```cpp
#include "Post.h"
#include <drogon/drogon.h>

namespace CMS::Models {

PostMapper::PostMapper(drogon::orm::DbClientPtr dbClient) : dbClient_(std::move(dbClient)) {}

drogon::orm::Future<Post> PostMapper::findById(long long id) {
    auto query = "SELECT id, title, content, author_id, category_id, published, content_type, created_at, updated_at FROM posts WHERE id = $1";
    return dbClient_->execSqlAsync(query, id).then([=](const drogon::orm::Result& result) {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("Post not found", 0);
        }
        const auto& row = result[0];
        return Post{
            row["id"].as<long long>(),
            row["title"].as<std::string>(),
            row["content"].as<std::string>(),
            row["author_id"].as<long long>(),
            row["category_id"].as<long long>(),
            row["published"].as<bool>(),
            row["content_type"].as<std::string>(),
            row["created_at"].as<std::string>(),
            row["updated_at"].as<std::string>()
        };
    });
}

drogon::orm::Future<std::vector<Post>> PostMapper::findAll() {
    auto query = "SELECT id, title, content, author_id, category_id, published, content_type, created_at, updated_at FROM posts ORDER BY created_at DESC";
    return dbClient_->execSqlAsync(query).then([=](const drogon::orm::Result& result) {
        std::vector<Post> posts;
        for (const auto& row : result) {
            posts.push_back(Post{
                row["id"].as<long long>(),
                row["title"].as<std::string>(),
                row["content"].as<std::string>(),
                row["author_id"].as<long long>(),
                row["category_id"].as<long long>(),
                row["published"].as<bool>(),
                row["content_type"].as<std::string>(),
                row["created_at"].as<std::string>(),
                row["updated_at"].as<std::string>()
            });
        }
        return posts;
    });
}

drogon::orm::Future<std::vector<Post>> PostMapper::findByAuthor(long long author_id) {
    auto query = "SELECT id, title, content, author_id, category_id, published, content_type, created_at, updated_at FROM posts WHERE author_id = $1 ORDER BY created_at DESC";
    return dbClient_->execSqlAsync(query, author_id).then([=](const drogon::orm::Result& result) {
        std::vector<Post> posts;
        for (const auto& row : result) {
            posts.push_back(Post{
                row["id"].as<long long>(),
                row["title"].as<std::string>(),
                row["content"].as<std::string>(),
                row["author_id"].as<long long>(),
                row["category_id"].as<long long>(),
                row["published"].as<bool>(),
                row["content_type"].as<std::string>(),
                row["created_at"].as<std::string>(),
                row["updated_at"].as<std::string>()
            });
        }
        return posts;
    });
}

drogon::orm::Future<std::vector<Post>> PostMapper::findByCategory(long long category_id) {
    auto query = "SELECT id, title, content, author_id, category_id, published, content_type, created_at, updated_at FROM posts WHERE category_id = $1 ORDER BY created_at DESC";
    return dbClient_->execSqlAsync(query, category_id).then([=](const drogon::orm::Result& result) {
        std::vector<Post> posts;
        for (const auto& row : result) {
            posts.push_back(Post{
                row["id"].as<long long>(),
                row["title"].as<std::string>(),
                row["content"].as<std::string>(),
                row["author_id"].as<long long>(),
                row["category_id"].as<long long>(),
                row["published"].as<bool>(),
                row["content_type"].as<std::string>(),
                row["created_at"].as<std::string>(),
                row["updated_at"].as<std::string>()
            });
        }
        return posts;
    });
}

drogon::orm::Future<Post> PostMapper::create(const Post& post) {
    auto query = "INSERT INTO posts (title, content, author_id, category_id, published, content_type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at";
    return dbClient_->execSqlAsync(query,
                                   post.title,
                                   post.content,
                                   post.author_id,
                                   post.category_id,
                                   post.published,
                                   post.content_type).then([post](const drogon::orm::Result& result) mutable {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("Failed to create post", 0);
        }
        const auto& row = result[0];
        post.id = row["id"].as<long long>();
        post.created_at = row["created_at"].as<std::string>();
        post.updated_at = row["updated_at"].as<std::string>();
        return post;
    });
}

drogon::orm::Future<Post> PostMapper::update(const Post& post) {
    auto query = "UPDATE posts SET title = $1, content = $2, author_id = $3, category_id = $4, published = $5, content_type = $6, updated_at = NOW() WHERE id = $7 RETURNING updated_at";
    return dbClient_->execSqlAsync(query,
                                   post.title,
                                   post.content,
                                   post.author_id,
                                   post.category_id,
                                   post.published,
                                   post.content_type,
                                   post.id).then([post](const drogon::orm::Result& result) mutable {
        if (result.empty()) {
            throw drogon::orm::UnexpectedRows("Post not found for update", 0);
        }
        const auto& row = result[0];
        post.updated_at = row["updated_at"].as<std::string>();
        return post;
    });
}

drogon::orm::Future<void> PostMapper::remove(long long id) {
    auto query = "DELETE FROM posts WHERE id = $1";
    return dbClient_->execSqlAsync(query, id).then([](const drogon::orm::Result& result) {
        if (result.affectedRows() == 0) {
            throw drogon::orm::UnexpectedRows("Post not found for deletion", 0);
        }
    });
}

} // namespace CMS::Models
```